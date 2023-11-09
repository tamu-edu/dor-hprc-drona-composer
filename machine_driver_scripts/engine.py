# !/bin/python3
import json
import re
import argparse
import ast
import os
from utils import *

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

def preprocess_template(template, params):
    pattern = r'!(\w+)\((.*?)\)'

    matches = re.findall(pattern, template)

    
    for match in matches:
        function_name = match[0]
        variables = match[1].split(",")
        variables = [variable.strip() for variable in variables]

        for variable in variables:
            # variable start with $
            if variable[0] == "$":
                variable = variable[1:]
                #  replace the variable with the value in params
                if variable in params:
                    variables[variables.index("$"+variable)] = params[variable]
            
                    
        if function_name in globals() and callable(globals()[function_name]):
            dynamic_function = globals()[function_name]
            
            # Call the function dynamically with the list of values
            result = dynamic_function(*variables)
            # replace the function call with the result
            template = template.replace(f"!{function_name}({match[1]})", result)
            
        else:
            return (f"Function {function_name} not found or not callable.")
        
    return template

class Engine():
    def __init__(self):
        self.enviroment = None
        self.schema = None
        self.map = None
        self.script = None
    
    def set_schema(self, schema_path):
        with open(schema_path) as json_file:
            self.schema = json.load(json_file)

    def set_map(self, map_path):
        with open(map_path) as json_file:
            self.map = json.load(json_file)

    def get_enviroment(self):
        return self.enviroment

    def get_schema(self):
        return self.schema
    
    def get_map(self):
        return self.map
    
    def fetch_template(self, template_path):
        with open(template_path) as text_file:
            template = text_file.read()
            return template
        
    def set_enviroment(self, enviroment):
        self.enviroment = enviroment
        self.set_map("maps/" + enviroment + ".json")
        self.set_schema("schemas/" + enviroment + ".json")
    
    def custom_replace(self, template, map, params):
        # 2 Steps replacement
        ## 1. Replace the map values in the template with params name
        for key, value in map.items():
            template = template.replace("["+key+"]", value)
        
        template = preprocess_template(template, params)
            
        ## 2. Replace the params name with the actual values in form fields
        # Keys with flag
        pattern_flag = r'-(.) \$(\w+)'
        template = re.sub(pattern_flag, lambda match: replace_flag(match, params), template)

        # Keys with no flag
        pattern_no_flag = r'\$(\w+)'
        template = re.sub(pattern_no_flag, lambda match: replace_no_flag(match, params), template)

        return template
        
    def generate_script(self, params):
        if self.enviroment is None:
            return "No enviroment selected"
        else:
            # template = params["run_command"]
            # script = self.custom_replace(template, self.map, params)
            # return script
            job_file_name = f"{params['name'].replace('-', '_').replace(' ', '_')}.job"

            job_file_path = os.path.join(params['location'], job_file_name)
            # Create a file with the job script
            with open(job_file_path, "w") as job_file:
                template = params["run_command"]
                self.script = self.custom_replace(template, self.map, params)
                self.script = self.script.replace("\t", " ")
                self.script = re.sub(r'\r\n?|\r', '\n', self.script)
                job_file.write(self.script)

            return job_file_path
        
    def generate_tamubatch_command(self, params):

        walltime = f"-W {params['walltime']} " if 'walltime' in params and params['walltime'] else ""
        use_gpu = "-gpu " if 'gpu' in params and params['gpu'] else ""
        total_cpu_cores = f"-n {params['cores']} " if 'cores' in params and params["cores"] else ""
        cores_per_node = f"-R {params['cores_per_node']} " if 'cores_per_node' in params and params['cores_per_node'] else ""

        if 'total_memory_number' in params and 'total_memory_unit' in params:
            total_mem = params['total_memory_number'] + params['total_memory_unit']
            total_mem = f"-M {total_mem} " if not re.match(r'^(MB|G)', total_mem) else ""

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
            bash_file.write(f"#!/bin/bash\ncd {location}\n{tamubatch_path} {walltime}{use_gpu}{total_cpu_cores}{cores_per_node}{total_mem}{account}{job_file_name}\n")
        return bash_file_path
        


        
            


def main():
    parser = argparse.ArgumentParser(description = "Engine")

    # argument for params dictionary
    parser.add_argument("-p", "--params", type = str, help = "Params Dictionary")
    parser.add_argument("-s", "--script", action="store_true", help = "Generate Script")
    parser.add_argument("-t", "--tamubatch", action="store_true", help = "Generate TamuBatch Command")
    args = parser.parse_args()
    params = None
    engine = Engine()
    if args.params:
        try:
            params = ast.literal_eval(args.params)  # Safely parse the dictionary string
            if isinstance(params, dict):
                engine.set_enviroment(params["runtime"])
            else:
                print("Invalid dictionary format 1")
        except (SyntaxError, ValueError) as e:
            print(e)
            print("Invalid dictionary format 2")
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