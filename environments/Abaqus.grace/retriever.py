#!/usr/bin/python3
import json

options = [
      {
        "value": "ABAQUS/2021",
        "label": "ABAQUS/2021"
      },
      {    
        "value": "ABAQUS/2022",
        "label": "ABAQUS/2022"
      },
      {
        "value": "ABAQUS/2023",
        "label": "ABAQUS/2023"
      }
    ]


json_string = json.dumps(options)
print(json_string)
