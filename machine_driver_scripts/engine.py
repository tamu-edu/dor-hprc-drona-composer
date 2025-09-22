import json
import re
import argparse
import ast
import shutil
import os
from machine_driver_scripts.utils import *
import importlib.util

def process_function(value, environment, env_dir):
    def find_function_calls(text):
        calls = []
        i = 0
        while i < len(text):
            # Skip var tags
            if text[i:i+5] == '<var>':
                i += 5
                while i < len(text) - 5 and text[i:i+6] != '</var>':
                    i += 1
                if i < len(text) - 5:
                    i += 6  # Skip closing tag
                continue
            # Check for function call
            if text[i] == '!':
                # Try to match function pattern starting from current position
                func_match = re.match(r'!(\w+)\(', text[i:])
                if func_match:
                    start = i
                    func_name = func_match.group(1)
                    i += len(func_match.group(0))  # Move past the opening parenthesis
                    params_start = i
                    # Find the matching closing parenthesis
                    while i < len(text):
                        if text[i] == ')':
                            # Found our closing parenthesis
                            params = text[params_start:i]
                            calls.append((start, i + 1, func_name, params))
                            i += 1  # Move past the closing parenthesis
                            break
                        elif text[i] in ['"', "'"]:
                            # Skip quoted string with proper escape handling
                            quote = text[i]
                            i += 1
                            while i < len(text):
                                if text[i] == '\\':
                                    # Skip escaped character
                                    i += 2  # Skip both backslash and escaped char
                                    if i > len(text):  # Bounds check
                                        break
                                elif text[i] == quote:
                                    # Found unescaped closing quote
                                    i += 1  # Skip closing quote
                                    break
                                else:
                                    i += 1
                        elif text[i:i+5] == '<var>':
                            # Skip var tag
                            i += 5
                            while i < len(text) - 5 and text[i:i+6] != '</var>':
                                i += 1
                            if i < len(text) - 5:
                                i += 6  # Skip closing tag
                        else:
                            i += 1
                else:
                    i += 1
            else:
                i += 1
        return calls 
    # Load modules
    global_utils_path = os.path.join("machine_driver_scripts", "utils.py")
    spec = importlib.util.spec_from_file_location("global_utils", global_utils_path)
    global_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(global_module)
    
    local_function_path = os.path.join(env_dir, environment, "utils.py")
    local_module = None
    if os.path.exists(local_function_path):
        spec = importlib.util.spec_from_file_location("utils", local_function_path)
        local_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(local_module)
        for func_name in dir(global_module):
            if callable(getattr(global_module, func_name)):
                setattr(local_module, func_name, getattr(global_module, func_name))
    
    # Process function calls (in reverse order to maintain string positions)
    calls = find_function_calls(value)
    for start, end, function_name, params_str in reversed(calls):
        # Parse parameters, handling quoted strings and tagged variables
        def parse_parameters(params_str):
            if not params_str.strip():
                return []
            
            params = []
            current_param = ""
            i = 0
            
            while i < len(params_str):
                if params_str[i] == ',':
                    params.append(current_param.strip())
                    current_param = ""
                elif params_str[i] in ['"', "'"]:
                    # Copy quoted string as-is
                    quote = params_str[i]
                    current_param += quote
                    i += 1
                    while i < len(params_str) and params_str[i] != quote:
                        current_param += params_str[i]
                        i += 1
                    if i < len(params_str):
                        current_param += params_str[i]  # Add closing quote
                elif params_str[i:i+5] == '<var>':
                    # Copy var tag as-is
                    start = i
                    i += 5
                    while i < len(params_str) - 5 and params_str[i:i+6] != '</var>':
                        i += 1
                    i += 6  # Include closing tag
                    current_param += params_str[start:i]
                    continue  # Skip the i += 1 at the end
                else:
                    current_param += params_str[i]
                i += 1
            
            if current_param.strip():
                params.append(current_param.strip())
            
            return params
        
        variables = parse_parameters(params_str) if params_str else []
        
        # Remove quotes from string parameters and unwrap tagged variables
        processed_variables = []
        for var in variables:
            var = var.strip()
            # Remove outer quotes if present
            if (var.startswith('"') and var.endswith('"')) or (var.startswith("'") and var.endswith("'")):
                var = var[1:-1]
            # Remove variable tags
            if var.startswith('<var>') and var.endswith('</var>'):
                var = var[5:-6]
            processed_variables.append(var)
        
        # Get the function
        if local_module and function_name in dir(local_module) and callable(getattr(local_module, function_name)):
            dynamic_function = getattr(local_module, function_name)
        elif function_name in dir(global_module) and callable(getattr(global_module, function_name)):
            dynamic_function = getattr(global_module, function_name)
        else:
            return f"Function {function_name} not found in local or global utils.py."
        
        # Execute the function
        try:
            result = dynamic_function(*processed_variables)
        except Exception as e:
            result = f"Error: {e}"
        
        if result is None:
            result = ""
        
        # Replace the function call with the result
        value = value[:start] + str(result) + value[end:]
    
    return value

def replace_flag(match, params):
    flag = match.group(1)
    param_name = match.group(2)
    if param_name in params:
        return f"-{flag} <var>{params[param_name]}</var>"
    return match.group(0)

def replace_no_flag(match, params):
    param_name = match.group(1)
    if param_name in params:
        return f"<var>{params[param_name]}</var>"
    return match.group(0)


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

    def evaluate_map(self, map, params):
        print(map)
        print("---------")
        for key, value in map.items():
            # 2. Replace the params name with the actual values in form fields
            # Keys with flag
        
            pattern_flag = r'-(.) \$(\w+)'
            value = re.sub(pattern_flag, lambda match: replace_flag(match, params), value)


            # Keys with no flag
            pattern_no_flag = r'\$(\w+)'
            value = re.sub(pattern_no_flag, lambda match: replace_no_flag(match, params), value)
        
            # Process functions
            value = process_function(value, self.environment, self.env_dir)
        
        
            # Remove variable tags
            value = re.sub(r'<var>(.*?)</var>', r'\1', value)
        
        
            map[key] = value
        print("Result:\n", map)
        return map

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

    def get_messages(self, params):
        user_id = os.getenv('USER')
        messages_path = os.path.join("/tmp", f"{user_id}.messages")
        if not os.path.exists(messages_path):
            return []

        messages = []
        
        with open(messages_path, 'r') as file: 
            messages_dict = json.load(file)
 
        if "messages" in messages_dict:
            messages = messages_dict["messages"] 

        os.remove(messages_path)

        return messages
        


    def fetch_template(self, template_path):
        try:
            with open(template_path) as text_file:
                template = text_file.read()
                return template
        except FileNotFoundError:
            return None
        
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
            
    def custom_replace_with_indentation(self, template, map, params):
        """
        Replace placeholders while preserving indentation for multi-line values.
        Could potentially be optimized.
        """
        for key, value in map.items():
            placeholder = "[" + key + "]"
            lines = template.split('\n')
            new_lines = []

            for line in lines:
                if placeholder in line:
                    indent_match = re.match(r'^(\s*)', line)
                    base_indent = indent_match.group(1) if indent_match else ''
                    
                    value_lines = str(value).split('\n')

                    replaced_line = line.replace(placeholder, value_lines[0])
                    new_lines.append(replaced_line)
                    
                    # Add remaining lines with proper indentation
                    for value_line in value_lines[1:]:
                        if value_line.strip(): 
                            new_lines.append(base_indent + value_line)
                        else:
                            new_lines.append(value_line)  # Keep empty lines as-is
                else:
                    new_lines.append(line)
            template = '\n'.join(new_lines)
        return template
    
    def custom_replace(self, template, map, params):
        return self.custom_replace_with_indentation(template, map, params)

    def replace_placeholders(self, input_script, map, params):
        if params['name'] == 'unnamed':
            job_file_name = "template.txt"
        else:
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
            
            if template is not None:
                self.script = self.replace_placeholders(template, evaluated_map, params)
            else:
                self.script = None

            self.driver = self.replace_placeholders(self.driver, evaluated_map, params)
            
            self.set_dynamic_additional_files(os.path.join(self.env_dir, self.environment) ,params)
            
            for fname, file in self.additional_files.items():
                file["content"] = self.replace_placeholders(file["content"], evaluated_map, params)
                self.additional_files[fname] = file

            additional_file = []
            for fname, file in self.dynamic_additional_files.items():

                file["content"] = self.replace_placeholders(file["content"], evaluated_map, params)
                self.additional_files[fname] = file 
            
            messages = self.get_messages(params)

            preview_job = {
                    "driver": self.driver, 
                    "messages":  messages,
                    "additional_files": self.additional_files 
            }
            if self.script is not None:
                preview_job["script"] = self.script
            
            return preview_job
        
    def generate_script(self, params):
        if self.environment is None:
            return "No environment selected"
        else:
            if params.get("run_command") is not None:
                if params['name'] == 'unnamed':
                    job_file_name = "template.txt"
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
            
            if params.get("run_command") is not None:
                return job_file_path
            else:
                return None
    
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

