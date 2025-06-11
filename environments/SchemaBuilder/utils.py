import json 

def convert_array_to_schema(elements_array):
    """
    Convert an array of form elements to a schema format.
    
    Args:
        elements_array (list): List of dictionaries with 'type' and 'config' keys
        
    Returns:
        dict: Schema format where keys are element names and values are element properties
    """
    schema = {}
    elements_array = json.loads(elements_array)
    
    for element in elements_array:
        # Extract the element type and config
        element_type = element.get('type')
        config = element.get('config', {})
        
        # Get the name from config to use as the key
        element_name = config.get('name')
        
        if element_name:
            # Create the schema entry by merging type with config
            schema[element_name] = {
                'type': element_type,
                **config  # Spread all config properties
            }
    
    return json.dumps(schema, indent=4)
