import json
import re
import argparse
import ast
import os
from machine_driver_scripts.utils import *
import importlib.util

def replace_flag(match, flag_dict):
    flagchar, flagname = match.group(1), match.group(2)
    if flagname in flag_dict and flag_dict[flagname] != "":
        return f"-{flagchar} {flag_dict[flagname]}"
    else:
        return ""

def replace_no_flag(match, flag_dict):
    flagname = match.group(1)
    if flagname in flag_dict:
        return flag_dict[flagname]
    else:
        return ""
    
def get_value_from_yaml(yaml_content, key):
    lines = yaml_content.splitlines()
    value = None
    key_found = False

    for line in lines:
        if key in line:
            key_found = True
        if key_found:
            value = line.split(":")[1].strip()
            value = value.replace("\'", "")
            value = value.replace("\"", "")
            break
    return value

def process_function(value, environment):
    pattern = r'!(\w+)\((.*?)\)'

    matches = re.findall(pattern, value)

    for match in matches:
        function_name = match[0]
        # variables = match[1].split(",")
        # variables = [variable.strip() for variable in variables]
        variables = [variable.strip() for variable in match[1].split(",")] if match[1] else []
        
        function_path = f"environments/{environment}/utils.py"
        if os.path.exists(function_path):
            spec = importlib.util.spec_from_file_location("utils", function_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            if function_name in dir(module) and callable(getattr(module, function_name)):
                dynamic_function = getattr(module, function_name)
                try:
                    result = dynamic_function(*variables)
                except Exception as e:
                    result = f"Error: {e}"
                # replace the function call with the result
                value = value.replace(f"!{function_name}({match[1]})", result)
        else:
            if function_name in globals() and callable(globals()[function_name]):
                dynamic_function = globals()[function_name]
                try:
                    result = dynamic_function(*variables)
                except Exception as e:
                    result = f"Error: {e}"
                # replace the function call with the result
                value = value.replace(f"!{function_name}({match[1]})", result)
            else:
                return (f"Function {function_name} not found or not callable.")
        
    return value


class Engine():
    def __init__(self):
        self.environment = None
        self.schema = None
        self.map = None
        self.script = None
        self.driver = None
    
    def set_schema(self, schema_path):
        with open(schema_path) as json_file:
            self.schema = json.load(json_file)

    def set_map(self, map_path):
        with open(map_path) as json_file:
            self.map = json.load(json_file)
    
    def set_driver(self, driver_path):
        with open(driver_path) as shell_script:
            self.driver = shell_script.read()

    def get_environment(self):
        return self.environment

    def get_schema(self):
        return self.schema
    
    def get_map(self):
        return self.map

    def get_driver(self):
        return self.driver
    
    def get_globals(self):
        return globals()
    
    def fetch_template(self, template_path):
        with open(template_path) as text_file:
            template = text_file.read()
            return template
        
    def set_environment(self, environment):
        self.environment = environment
        self.set_map("environments/" + environment + "/map.json")
        self.set_schema("environments/" + environment + "/schema.json")
        self.set_driver("environments/" + environment + "/driver.sh")


    def evaluate_map(self, map, params):
        for key, value in map.items():
            ## 2. Replace the params name with the actual values in form fields
            # Keys with flag
            pattern_flag = r'-(.) \$(\w+)'
            value = re.sub(pattern_flag, lambda match: replace_flag(match, params), value)

            # Keys with no flag
            pattern_no_flag = r'\$(\w+)'
            value = re.sub(pattern_no_flag, lambda match: replace_no_flag(match, params), value)

            value = process_function(value, self.environment)
            map[key] = value
        return map
    
    def custom_replace(self, template, map, params):
        map = self.evaluate_map(map, params)
        for key, value in map.items():
            template = template.replace("["+key+"]", value)
        return template
    
    def preview_script(self, params):
        if self.environment is None:
            return "No environment selected"
        else:
            job_file_name = f"{params['name'].replace('-', '_').replace(' ', '_')}.job"
            template = params["run_command"]
            self.script = self.custom_replace(template, self.map, params)
            self.script = self.script.replace("[job-file-name]", job_file_name)
            self.script = self.script.replace("\t", " ")
            self.script = re.sub(r'\r\n?|\r', '\n', self.script)
            return self.script
        
    def generate_script(self, params):
        if self.environment is None:
            return "No environment selected"
        else:
            # template = params["run_command"]
            # script = self.custom_replace(template, self.map, params)
            # return script
            job_file_name = f"{params['name'].replace('-', '_').replace(' ', '_')}.job"

            job_file_path = os.path.join(params['location'], job_file_name)
            # Create a file with the job script
            with open(job_file_path, "w") as job_file:
                self.script = params["run_command"]
                self.script = self.script.replace("\t", " ")
                self.script = re.sub(r'\r\n?|\r', '\n', self.script)
                job_file.write(self.script)

            return job_file_path
        
    def generate_tamubatch_command(self, params):
        walltime = f"-W {params['walltime']} " if 'walltime' in params and params['walltime'] else ""
        use_gpu = "-gpu " if 'gpu' in params and params['gpu'] else ""
        total_cpu_cores = f"-n {params['cores']} " if 'cores' in params and params["cores"] else ""
        cores_per_node = f"-R {params['cores_per_node']} " if 'cores_per_node' in params and params['cores_per_node'] else ""
        extra_slurm = f"-x '{params['extra_slurm']}' " if 'extra_slurm' in params and params['extra_slurm'] else ""
        total_mem = f"-M '{params['total_memory']}' " if 'total_memory' in params and params['total_memory'] else ""
        

        account = f"-P {params['project_account']} " if 'project_account' in params and params['project_account'].strip() else ""
        
        with open("config.yml", "r") as config_file:
            yaml_content = config_file.read()
        key = "tamubatch_path"
        tamubatch_path = get_value_from_yaml(yaml_content, f"{key}:")

        job_file_name = f"{params['name'].replace('-', '_').replace(' ', '_')}.job"
        job_file_path = os.path.join(params['location'], job_file_name)
        bash_file_path = os.path.join(params['location'], "run.sh")
        location = params['location']
        
        with open(bash_file_path, "w") as bash_file:
           # bash_file.write(f"#!/bin/bash\ncd {location}\n{tamubatch_path} {walltime}{use_gpu}{total_cpu_cores}{cores_per_node}{total_mem}{account}{job_file_path}\n")
            bash_file.write(f"#!/bin/bash\nsource /etc/profile\ncd {location}\n{tamubatch_path} {extra_slurm}{walltime}{use_gpu}{total_cpu_cores}{cores_per_node}{total_mem}{account}{job_file_name}\n")
        return bash_file_path
    
    def generate_driver_script(self, params):
        if self.environment is None:
            return "No environment selected"
        else:
            job_file_name = f"{params['name'].replace('-', '_').replace(' ', '_')}.job"
            bash_file_path = os.path.join(params['location'], "run.sh")
            with open(bash_file_path, "w") as bash_file:
                self.driver = self.custom_replace(self.driver, self.map, params)
                self.driver = self.driver.replace("[job-file-name]", job_file_name)
                self.driver = self.driver.replace("\t", " ")
                self.driver = re.sub(r'\r\n?|\r', '\n', self.driver)
                bash_file.write(self.driver)

            return bash_file_path


        


        
            


def main():
    parser = argparse.ArgumentParser(description = "Engine")

    # argument for params dictionary
    parser.add_argument("-p", "--params", type = str, help = "Params Dictionary")
    parser.add_argument("-s", "--script", action="store_true", help = "Generate Script")
    parser.add_argument("-t", "--tamubatch", action="store_true", help = "Generate TamuBatch Command")
    parser.add_argument("-j", "--preview", action="store_true", help = "Preview Script")

    args = parser.parse_args()
    params = None
    engine = Engine()
    if args.params:
        try:
            params = ast.literal_eval(args.params)  # Safely parse the dictionary string
            if isinstance(params, dict):
                engine.set_environment(params["runtime"])
            else:
                print("Invalid dictionary format 1")
        except (SyntaxError, ValueError) as e:
            print(e)
            print("Invalid dictionary format 2")
    if args.preview:
        if params:
            print(engine.preview_script(params))
        else:
            print("No dictionary provided.")
            parser.print_help()
    if args.script:
        if params:
            print(engine.generate_script(params))
        else:
            print("No dictionary provided.")
            parser.print_help()
    if args.tamubatch:
        if params:
            print(engine.generate_tamubatch_command(params))
        else:
            print("No dictionary provided.")
            parser.print_help()

if __name__ == "__main__":
    main()