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

def process_function(value, environment, env_dir):
    pattern = r'!(\w+)\((.*?)\)'

    matches = re.findall(pattern, value)

    for match in matches:
        function_name = match[0]
        # variables = match[1].split(",")
        # variables = [variable.strip() for variable in variables]
        variables = [variable.strip() for variable in match[1].split(",")] if match[1] else []
        
        function_path = os.path.join(env_dir, environment, "utils.py")
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
        self.env_dir = None
        self.schema = None
        self.map = None
        self.script = None
        self.driver = None
        self.drona_job_name = None
        self.drona_job_location = None
        self.additional_files=None
    
    def set_schema(self, schema_path):
        with open(schema_path) as json_file:
            self.schema = json.load(json_file)

    def set_map(self, map_path):
        with open(map_path) as json_file:
            self.map = json.load(json_file)
    
    def set_driver(self, driver_path):
        with open(driver_path) as shell_script:
            self.driver = shell_script.read()

    def set_additional_files(self,files_path):
        self.additional_files= {}
        filename = os.path.join(files_path, "additional_files.json")
        if os.path.isfile(filename):
            with open(filename) as additional_scripts:
                try:
                    additional_scripts = json.load(additional_scripts)
                except json.JSONDecodeError:
                    print(f"Error: The file '{filename}' contains invalid JSON.")
                    return

            for nkey in additional_scripts["files"]:
                keystring = nkey.strip()
                nfile= os.path.join(files_path,keystring)
                if os.path.isfile(nfile):
                    with open(nfile) as nshell_script:
                        self.additional_files[keystring] = nshell_script.read()
        else:
            self.additional_files= {}

    def get_environment(self):
        return self.environment

    def get_env_dir(self):
        return self.env_dir

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
        
    def set_environment(self, environment, env_dir):
        self.environment = environment
        self.env_dir = env_dir
        self.set_map(os.path.join(env_dir, environment, "map.json"))
        self.set_schema(os.path.join(env_dir, environment, "schema.json"))
        self.set_driver(os.path.join(env_dir, environment, "driver.sh"))
        self.set_additional_files(os.path.join(env_dir, environment))

    def evaluate_map(self, map, params):
        for key, value in map.items():
            ## 2. Replace the params name with the actual values in form fields
            # Keys with flag
            pattern_flag = r'-(.) \$(\w+)'
            value = re.sub(pattern_flag, lambda match: replace_flag(match, params), value)

            # Keys with no flag
            pattern_no_flag = r'\$(\w+)'
            value = re.sub(pattern_no_flag, lambda match: replace_no_flag(match, params), value)

            value = process_function(value, self.environment, self.env_dir)
            map[key] = value
        return map
    
    def custom_replace(self, template, map, params):
        map = self.evaluate_map(map, params)
        for key, value in map.items():
            template = template.replace("["+key+"]", value)
        return template

    def replace_placeholders(self, input_script, map, params):
        job_file_name = f"{params['name'].replace('-', '_').replace(' ', '_')}.job"
        output = self.custom_replace(input_script, map, params)
        output = output.replace("[job-file-name]", job_file_name)
        output = output.replace("\t", " ")
        output = re.sub(r'\r\n?|\r', '\n', output)

        return output
    
    
    def preview_script(self, params):
        if self.environment is None:
            return "No environment selected"
        else:
            template = self.fetch_template(os.path.join(self.env_dir, self.environment, "template.txt"))
            self.script = self.replace_placeholders(template, self.map, params)
            self.driver = self.replace_placeholders(self.driver, self.map, params)
            
            for fname, content in self.additional_files.items():
                content = self.replace_placeholders(content, self.map, params)
                self.additional_files[fname] = content

            warnings = []
            if "drona_warnings" in self.map:
                warnings = ast.literal_eval(self.map["drona_warnings"])
         
            preview_job = {
                    "driver": self.driver, 
                    "script": self.script, 
                    "warnings":  warnings,
                    "additional_files": self.additional_files 
            }
            
            return preview_job
        
    def generate_script(self, params):
        if self.environment is None:
            return "No environment selected"
        else:
            job_file_name = f"{params['name'].replace('-', '_').replace(' ', '_')}.job"
            job_file_path = os.path.join(params['location'], job_file_name)
            # Create a file with the job script
            with open(job_file_path, "w") as job_file:
                self.script = params["run_command"]
                self.script = self.script.replace("\t", " ")
                self.script = re.sub(r'\r\n?|\r', '\n', self.script)
                job_file.write(self.script)

            self.additional_files = json.loads(params["additional_files"])
            for fname, content in self.additional_files.items():
                # Copy  files with the job script
                nfile=content
                additional_job_file_path = os.path.join(params['location'], fname)
                with open(additional_job_file_path, "w") as ajob_file:
                    nfile = self.replace_placeholders(nfile, self.map, params)
                    ajob_file.write(nfile)

            return job_file_path
    
    def generate_driver_script(self, params):
        if self.environment is None:
            return "No environment selected"
        else:
            bash_file_path = os.path.join(params['location'], "run.sh")
            with open(bash_file_path, "w") as bash_file:
                self.driver = params["driver"]
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
                engine.set_environment(params["runtime"], params["env_dir"])
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

