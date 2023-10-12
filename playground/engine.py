import json
import re

def replace_flag(match, flag_dict):
    flagchar, flagname = match.group(1), match.group(2)
    if flagname in flag_dict:
        return f"-{flagchar} {flag_dict[flagname]}"
    else:
        return ""

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
            template = template.replace(key, value)
        # return template

        ## 2. Replace the params name with the actual values in form fields
        # Keys with no flag
        for key, value in params.items():
            template = template.replace("["+key+"]", value)

        # Keys with flag
        pattern = r'\[-(.) (\w+)\]'
        template = re.sub(pattern, lambda match: replace_flag(match, params), template)
        # print(template)

        # template = template.replace("[", "").replace("]", "")
        return template
        
    def generate_script(self, params):
        if self.enviroment is None:
            return "No enviroment selected"
        else:
            template = self.fetch_template("templates/" + self.enviroment + ".txt")
            self.script = self.custom_replace(template, self.map, params)
            return self.script

engine = Engine()
engine.set_enviroment("matlab")


map = engine.get_map()
schema = engine.get_schema()

# Assumming that we receive a params object from the sinatra app for the actual values of the schema
params = {"version": "2019", "workers": "6", "threads": "8", "location": "/scratch/ondemand/myjob", "mainscript": "job.sh"}

# print(map)
# print(schema)  

# template = engine.fetch_template("templates/matlab.txt")
# print(template)
script = engine.generate_script(params)
print(script)