import json
import re
import argparse
import ast
import shutil
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

    global_utils_path = os.path.join("machine_driver_scripts", "utils.py")
    
    spec = importlib.util.spec_from_file_location("global_utils", global_utils_path)
    global_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(global_module)
    
    for match in matches:
        function_name = match[0]
        variables = [variable.strip() for variable in match[1].split(",")] if match[1] else []
        
        local_function_path = os.path.join(env_dir, environment, "utils.py")
        
        local_module = None
        if os.path.exists(local_function_path):
            spec = importlib.util.spec_from_file_location("utils", local_function_path)
            local_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(local_module)
            
            for func_name in dir(global_module):
                if callable(getattr(global_module, func_name)):
                    setattr(local_module, func_name, getattr(global_module, func_name))
        
        if local_module and function_name in dir(local_module) and callable(getattr(local_module, function_name)):
            dynamic_function = getattr(local_module, function_name)
        elif function_name in dir(global_module) and callable(getattr(global_module, function_name)):
            dynamic_function = getattr(global_module, function_name)
        else:
            return (f"Function {function_name} not found in local or global utils.py.")
        
        try:
            result = dynamic_function(*variables)
        except Exception as e:
            result = f"Error: {e}"
        
        if result is None:
            return ""

        value = value.replace(f"!{function_name}({match[1]})", result) 
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

    def set_additional_files(self,env_path):
        self.additional_files= {}
        
        files_path = os.path.join(env_path, "additional_files.json")
        
        if not os.path.exists(files_path):
            return
        
        with open(files_path, 'r') as file:
            additional_files = json.load(file)

        for additional_file in additional_files:
            file_name = additional_file["file_name"].strip()
            
            if "preview_name" in additional_file:
                preview_name = additional_file["preview_name"].strip()
                preview_name = file_name if preview_name == "" else preview_name
            else:
                preview_name = file_name
            
            if "preview_order" in additional_file:
                preview_order = additional_file["preview_order"]
                preview_order = 0 if preview_order < 0 else preview_order
            else:
                preview_order = 0
            
            file_path = os.path.join(env_path, "additional_files", file_name)
        
            if os.path.isfile(file_path):
                with open(file_path) as file:
                     self.additional_files[os.path.basename(file_name)] = {
                            "content": file.read(),
                            "preview_name": preview_name,
                            "preview_order": preview_order
                    }


    def set_dynamic_additional_files(self, env_path, params):
        user_id = os.getenv('USER')

        self.dynamic_additional_files = {}
        files_path = env_path
        additional_files_path = os.path.join("/tmp", f"{user_id}.additional_files")
        
        if not os.path.exists(additional_files_path):
            return 

        with open(additional_files_path, 'r') as file: 
            additional_files = json.load(file)
 
        for additional_file in additional_files:
                file_name  = additional_file["file_name"].strip()
            
                preview_name = additional_file["preview_name"].strip()
                preview_name = file_name if preview_name == "" else preview_name 

                preview_order = additional_file["preview_order"]
                preview_order = 0 if preview_order < -1 else preview_order

                file_path = os.path.join(files_path, file_name)
                if os.path.isfile(file_path):
                    with open(file_path) as file:
                        self.dynamic_additional_files[os.path.basename(file_name)] = {
                                "content": file.read(),
                                "preview_name": preview_name,
                                "preview_order": preview_order
                        }

        os.remove(additional_files_path)
            
    def get_dynamic_map(self):
        user_id = os.getenv('USER')

        dynamic_map = os.path.join("/tmp", f"{user_id}.map")
        
        if not os.path.exists(dynamic_map):
            return {}

        with open(dynamic_map, 'r') as file:
            map_dict = json.load(file)

        os.remove(dynamic_map)

        return map_dict

   

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
   
    def get_warnings(self, params):
        user_id = os.getenv('USER')
        warnings_path = os.path.join("/tmp", f"{user_id}.warnings")
        if not os.path.exists(warnings_path):
            return []

        warnings = []
        
        with open(warnings_path, 'r') as file: 
            warnings_dict = json.load(file)
 
        if "warnings" in warnings_dict:
            warnings = warnings_dict["warnings"] 

        os.remove(warnings_path)

        return warnings
        


    def fetch_template(self, template_path):
        with open(template_path) as text_file:
            template = text_file.read()
            return template
        
    def set_environment(self, environment, env_dir):
        self.environment = environment
        self.env_dir = env_dir
        self.set_driver(os.path.join(env_dir, environment, "driver.sh"))
        self.set_additional_files(os.path.join(env_dir, environment))

        # Rerunned jobs do not need map or schema.
        if os.path.exists(os.path.join(env_dir, environment, "map.json")):
            self.set_map(os.path.join(env_dir, environment, "map.json"))
        if os.path.exists(os.path.join(env_dir, environment, "schema.json")):
            self.set_schema(os.path.join(env_dir, environment, "schema.json"))

        
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
            self.drona_job_name = params["name"]
            evaluated_map = self.evaluate_map(self.map, params)
            
            dynamic_map = self.get_dynamic_map()
            
            dynamic_evaluated_map = self.evaluate_map(dynamic_map, params)
            evaluated_map = {**dynamic_evaluated_map, **evaluated_map}

            template = self.fetch_template(os.path.join(self.env_dir, self.environment, "template.txt"))
            self.script = self.replace_placeholders(template, evaluated_map, params)
            self.driver = self.replace_placeholders(self.driver, evaluated_map, params)
            
            self.set_dynamic_additional_files(os.path.join(self.env_dir, self.environment) ,params)
            
            for fname, file in self.additional_files.items():
                file["content"] = self.replace_placeholders(file["content"], evaluated_map, params)
                self.additional_files[fname] = file

            additional_file = []
            for fname, file in self.dynamic_additional_files.items():

                file["content"] = self.replace_placeholders(file["content"], evaluated_map, params)
                self.additional_files[fname] = file 
            
            warnings = self.get_warnings(params)

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
                with open(os.path.join(additional_job_file_path), "w") as ajob_file:
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

