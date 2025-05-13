#!/usr/bin/env node
/**
 * Drona Demo Environment Generator with JSON Examples and Mock Retrievers
 *
 * This script generates a complete Drona demo environment by:
 * 1. Extracting JSON examples from JSDoc comments
 * 2. Creating Schema.json with these examples
 * 3. Creating Map.json with value references
 * 4. Creating type-specific mock retriever scripts for dynamic components
 * 5. Creating driver.sh script to display values
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SCHEMA_DIR = './src/schemaRendering/schemaElements';
const DEMO_OUTPUT_DIR = './environments/demo-drona-env';
const DEMO_RETRIEVERS_DIR = path.join(DEMO_OUTPUT_DIR, 'retrievers');
const COMPONENTS_MAP_FILE = path.join(SCHEMA_DIR, 'index.js');

// Ensure demo directories exist
if (!fs.existsSync(DEMO_OUTPUT_DIR)) {
  fs.mkdirSync(DEMO_OUTPUT_DIR, { recursive: true });
}

if (!fs.existsSync(DEMO_RETRIEVERS_DIR)) {
  fs.mkdirSync(DEMO_RETRIEVERS_DIR, { recursive: true });
}

// Helper to extract JSDoc comments from a file
function extractJSDocComment(fileContent) {
  const jsDocRegex = /\/\*\*\s*([\s\S]*?)\s*\*\//m;
  const match = fileContent.match(jsDocRegex);
  return match ? match[1] : null;
}

// Extract JSON examples from JSDoc comments
function extractJsonExamples(comment) {
  if (!comment) return [];

  const examples = [];
  // Extract sections that start with @example
  const exampleRegex = /@example\s*([\s\S]*?)(?=@|\*\/|$)/g;
  let exampleMatch;

  while ((exampleMatch = exampleRegex.exec(comment)) !== null) {
    // Extract the example content
    let exampleContent = exampleMatch[1];

    // Extract description (comment line that starts with //)
    let description = '';
    const descriptionMatch = exampleContent.match(/\/\/\s*(.*?)(?=\n|$)/);
    if (descriptionMatch) {
      description = descriptionMatch[1].trim();
    }

    // Clean up JSDoc formatting
    // 1. Split into lines
    const lines = exampleContent.split('\n');
    let jsonText = '';

    // 2. Process each line to remove asterisks and leading spaces from JSDoc format
    for (const line of lines) {
      // Skip comment lines
      if (line.trim().startsWith('//')) continue;

      // Remove asterisks and leading spaces from JSDoc formatting
      const cleanedLine = line.replace(/^\s*\*\s*/, '');
      jsonText += cleanedLine + '\n';
    }

    // 3. Try to find JSON object block
    const jsonStartIndex = jsonText.indexOf('{');
    const jsonEndIndex = jsonText.lastIndexOf('}');

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
      // Extract the JSON object text
      const jsonObjectText = jsonText.substring(jsonStartIndex, jsonEndIndex + 1);

      try {
        // Parse the JSON
        const jsonObject = JSON.parse(jsonObjectText);

        // Add description as help text if not already present
        if (description && !jsonObject.help) {
          jsonObject.help = description;
        }

        // Process retriever paths for dynamic components
        if (jsonObject.isDynamic && jsonObject.retriever) {
          // Keep the retriever filename but update path to point to our demo retrievers
          const retrieverName = path.basename(jsonObject.retriever);
          jsonObject.retriever = `retrievers/${retrieverName}`;
        }

        examples.push(jsonObject);
      } catch (error) {
        console.warn(`Error parsing JSON example: ${error.message}`);
        console.warn(`Attempted to parse: ${jsonObjectText}`);
      }
    }
  }

  return examples;
}

// Read the componentsMap from index.js to get component types
function extractComponentsMap() {
  const indexContent = fs.readFileSync(COMPONENTS_MAP_FILE, 'utf8');
  const componentsMapMatch = indexContent.match(/export const componentsMap = ({[\s\S]*?});/);

  if (!componentsMapMatch || !componentsMapMatch[1]) {
    console.error('Could not extract componentsMap from index.js');
    process.exit(1);
  }

  const componentMapStr = componentsMapMatch[1];
  const typeToComponentMap = {};

  // Extract key-value pairs
  const componentPairs = componentMapStr.match(/(\w+):\s*(\w+)/g) || [];
  componentPairs.forEach(pair => {
    const [type, component] = pair.split(':').map(s => s.trim());
    typeToComponentMap[type] = component;
  });

  // Create reverse mapping from component name to type
  const componentToTypeMap = {};
  Object.entries(typeToComponentMap).forEach(([type, component]) => {
    componentToTypeMap[component] = type;
  });

  return componentToTypeMap;
}

function extractComponentNameFromJSDoc(jsDocComment) {
  if (!jsDocComment) return null;

  // Look for @component tag followed by a name
  const componentTagRegex = /@component\s+(\w+)/;
  const match = jsDocComment.match(componentTagRegex);

  return match ? match[1] : null;
}

// Generate Schema.json with examples from JSDoc
function generateSchema(componentTypeMap) {
  const schema = {};
  const componentFiles = fs.readdirSync(SCHEMA_DIR)
    .filter(file => file.endsWith('.js') && file !== 'index.js');
  componentFiles.forEach((file) => {
  const filePath = path.join(SCHEMA_DIR, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const jsDocComment = extractJSDocComment(fileContent);

    const componentName = extractComponentNameFromJSDoc(jsDocComment) || path.basename(file, '.js');
    const componentType = componentTypeMap[componentName];

    if (!componentType) {
      console.warn(`No type found for component ${componentName} in componentsMap`);
      return;
    }

    // Extract JSON examples
    const examples = extractJsonExamples(jsDocComment);

    if (examples.length > 0) {
      // Add each example to the schema
      examples.forEach((example, index) => {
        const demoId = `demo_${componentType}_${index}`;
        
        // Make sure type is set correctly
        example.type = componentType;
        
        // Set the name to match the demoId if not specified
        if (!example.name) {
          example.name = demoId;
        }

        // Add to schema
        schema[demoId] = example;
      });

      console.log(`Added ${examples.length} examples for ${componentName}`);
    } else {
      console.warn(`No examples found for ${componentName}`);
    }
  });

  return schema;
}

// Find all fields referenced in retriever parameters and ensure they exist
function ensureReferencedFieldsExist(schema) {
  console.log('\nChecking for referenced fields in retriever parameters...');
  const referencedFields = new Set();
  const existingFields = new Set(Object.values(schema).map(component => component.name));

  // Find all referenced fields in retriever parameters
  Object.values(schema).forEach(component => {
    if (component.retrieverParams) {
      Object.values(component.retrieverParams).forEach(param => {
        if (typeof param === 'string' && param.startsWith('$')) {
          const fieldName = param.substring(1);
          if (!existingFields.has(fieldName)) {
            referencedFields.add(fieldName);
          }
        }
      });
    }
  });

  // Create fields for references that don't exist
  if (referencedFields.size > 0) {
    console.log(`Creating ${referencedFields.size} referenced fields that don't exist yet`);

    referencedFields.forEach(fieldName => {
      const demoId = `demo_referenced_${fieldName}`;
      schema[demoId] = {
        type: 'text',
        label: `${fieldName} (Referenced)`,
        name: fieldName,
        value: `Sample ${fieldName} value`,
        help: `This field is referenced by a dynamic component's retriever`
      };
      console.log(`Created referenced field: ${fieldName}`);
    });
  } else {
    console.log('No missing referenced fields found');
  }

  return referencedFields.size;
}

// Add a component with a retriever that uses referenced values if none exist yet
function ensureDynamicWithParamsExists(schema) {
  // Check if we already have a component with retrieverParams
  const hasRetrieverWithParams = Object.values(schema).some(component =>
    component.isDynamic && component.retriever && component.retrieverParams);

  if (!hasRetrieverWithParams) {
    console.log('\nAdding demo component with retriever parameters...');

    // Add a userId field if it doesn't exist
    const userIdField = Object.values(schema).find(component => component.name === 'userId');

    if (!userIdField) {
      schema['demo_text_userId'] = {
        type: 'text',
        label: 'User ID',
        name: 'userId',
        value: '12345',
        help: 'This field is referenced by the parameterized retriever demo'
      };
    }

    // Add a staticText component with retrieverParams
    schema['demo_staticText_withParams'] = {
      type: 'staticText',
      label: 'Parameterized Content',
      name: 'parameterizedDemo',
      help: 'This demonstrates passing form values to a retriever script',
      isDynamic: true,
      retriever: 'retrievers/parameterized_retriever.sh',
      retrieverParams: {
        id: '$userId',
        timestamp: '!current_timestamp()'
      },
      showRefreshButton: true,
      allowHtml: true
    };

    // Create the parameterized retriever
    const retrieverPath = path.join(DEMO_RETRIEVERS_DIR, 'parameterized_retriever.sh');
    const retrieverContent = `#!/bin/bash
# Parameterized retriever demo script
# Shows how to access parameters passed from the form

# Get parameters from environment
USER_ID="\${DRONA_PARAM_id:-not provided}"
TIMESTAMP="\${DRONA_PARAM_timestamp:-not provided}"

# Generate HTML content with the parameters
cat << EOF
<div style="padding: 10px; background: #e9f7ef; border: 1px solid #27ae60; border-radius: 4px; margin: 10px 0;">
  <h4 style="color: #27ae60; margin-top: 0;">Parameterized Content Demo</h4>
  <p>This retriever demonstrates passing form values as parameters.</p>

  <div style="margin-top: 10px; padding: 8px; background: #f2fcf5; border-radius: 4px;">
    <h5 style="margin-top: 0;">Parameters Received:</h5>
    <ul>
      <li><strong>User ID:</strong> \${USER_ID}</li>
      <li><strong>Timestamp:</strong> \${TIMESTAMP}</li>
    </ul>
  </div>

  <p><em>Try changing the User ID field above and click Refresh!</em></p>
</div>
EOF
`;

    fs.writeFileSync(retrieverPath, retrieverContent, { mode: 0o755 });
    console.log(`Created parameterized retriever demo: ${retrieverPath}`);

    return true;
  }

  return false;
}

// Create a retriever that returns JSON options array for select components
function createSelectOptionsRetriever(component, retrieverName) {
  return `#!/bin/bash
# Mock retriever for ${component.type} component: ${component.name}
# This script returns JSON option data for dynamic select components

# Check if a query parameter was passed (for autocomplete)
QUERY="\${DRONA_PARAM_query:-}"

# Generate different results based on query if present
if [ -n "$QUERY" ]; then
  # For autocomplete, filter options based on query
  echo '[
    {"value": "'$QUERY'_option1", "label": "Result: '$QUERY' Option 1"},
    {"value": "'$QUERY'_option2", "label": "Result: '$QUERY' Option 2"},
    {"value": "'$QUERY'_option3", "label": "Result: '$QUERY' Option 3"}
  ]'
else
  # Default options if no query
  echo '[
    {"value": "option1", "label": "Option 1"},
    {"value": "option2", "label": "Option 2"},
    {"value": "option3", "label": "Option 3"},
    {"value": "option4", "label": "Option 4"},
    {"value": "option5", "label": "Option 5"}
  ]'
fi
`;
}

// Create a retriever that returns HTML content
function createHtmlRetriever(component, retrieverName) {
  return `#!/bin/bash
# Mock retriever for demo component: ${component.name}
# This script generates sample HTML content for demonstration purposes

# Get any parameters passed from the form
PARAMS="$(env | grep DRONA_PARAM_ || echo 'No parameters passed')"

# Print HTML content
cat << EOF
<div style="padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; margin: 10px 0;">
  <h4 style="color: #495057; margin-top: 0;">Dynamic HTML Content</h4>
  <p>This content is dynamically generated by <code>${retrieverName}</code>.</p>
  <p>Component name: <strong>${component.name}</strong></p>
  <p>Timestamp: <em>$(date)</em></p>
  
  <div style="margin-top: 10px; padding: 8px; background: #e9ecef; border-radius: 4px;">
    <h5 style="margin-top: 0;">Parameters:</h5>
    <pre>$PARAMS</pre>
  </div>
</div>
EOF
`;
}

// Create a retriever that returns plain text
function createTextRetriever(component, retrieverName) {
  return `#!/bin/bash
# Mock retriever for demo component: ${component.name}
# This script generates sample text content for demonstration purposes

cat << EOF
===== DYNAMIC CONTENT DEMO =====
Generated by: ${retrieverName}
Component: ${component.name}
Timestamp: $(date)

Parameters:
$(env | grep DRONA_PARAM_ || echo "No parameters passed")
================================
EOF
`;
}

// Create mock retrievers for all dynamic components
function createMockRetrievers(schema) {
  console.log('\nCreating mock retriever scripts...');
  const mockRetrievers = new Set();

  // Find all components that use retrievers
  Object.values(schema).forEach(component => {
    if (component.retriever) {
      // Extract retriever name from path
      const retrieverName = path.basename(component.retriever);
      const mockRetrieverPath = path.join(DEMO_RETRIEVERS_DIR, retrieverName);

      // Skip if we've already created this retriever
      if (mockRetrievers.has(retrieverName)) {
        return;
      }

      mockRetrievers.add(retrieverName);
      
      // Determine retriever type based on component type
      let mockContent = '';
      
      if (component.type === 'autocompleteSelect' || component.type === 'dynamicSelect') {
        // For select components that need options
        mockContent = createSelectOptionsRetriever(component, retrieverName);
      } else if (component.allowHtml) {
        // For components that support HTML
        mockContent = createHtmlRetriever(component, retrieverName);
      } else {
        // Default to plain text retriever
        mockContent = createTextRetriever(component, retrieverName);
      }
      
      // Write the mock script file and make it executable
      fs.writeFileSync(mockRetrieverPath, mockContent, { mode: 0o755 });
      console.log(`Created mock retriever: ${mockRetrieverPath}`);
    }
  });

  return mockRetrievers.size;
}

// Generate Map.json with references to form values
function generateMap(schema) {
  const map = {};

  // Create mappings for each field in the schema
  Object.keys(schema).forEach(fieldId => {
    const field = schema[fieldId];

    // Skip container components
    if (['rowContainer', 'collapsibleRowContainer', 'collapsibleColContainer'].includes(field.type)) {
      // Process children if they exist
      if (field.children) {
        Object.keys(field.children).forEach(childId => {
          map[`${childId}_value`] = `$${childId}`;
        });
      }
      return;
    }

    // Add field value reference
    map[`${fieldId}_value`] = `$${fieldId}`;

    // For some field types, add example function calls
    if (['text', 'number', 'select'].includes(field.type)) {
      map[`${fieldId}_processed`] = `!process_value($${fieldId})`;
    }
  });

  // Add some utility mappings
  map.timestamp = '!current_timestamp()';
  map.all_values_json = '!json_encode_values()';

  return map;
}

// Generate driver.sh script
function generateDriverScript(retrieverCount) {
  return `#!/bin/bash
# Drona Demo Environment - Driver Script
# This script displays values from form elements and explains dynamic content

source /etc/profile
cd \${DRONA_JOB_DIR}

echo "======================"
echo "DRONA DEMO ENVIRONMENT"
echo "======================"
echo ""

echo "Form Values:"
echo "------------"
cat form_values.json

echo ""
echo "Processed Values:"
echo "----------------"
cat processed_values.json

echo ""
echo "Dynamic Content Components:"
echo "--------------------------"
echo "This demo includes ${retrieverCount} retriever scripts for dynamic content:"
find retrievers/ -type f -name "*.sh" -exec echo "  - {}" \\;

echo ""
echo "About Dynamic Content:"
echo "--------------------"
echo "In a real Drona environment, dynamic components use retriever scripts"
echo "to fetch content from external systems, APIs, or run calculations."
echo ""
echo "In this demo environment, mock retrievers in the 'retrievers/' directory"
echo "generate sample data for demonstration purposes."
echo ""
echo "Features demonstrated:"
echo "  - Static and dynamic content display"
echo "  - HTML formatting capabilities"
echo "  - Manual refresh buttons"
echo "  - Parameterized retrievers (passing form values to scripts)"
echo "  - AutocompleteSelect with dynamic search results"
echo ""
echo "Try changing form values and clicking refresh on dynamic components!"
`;
}

// Add examples if none exist for core components
function ensureCoreComponentsExist(schema) {
  console.log('\nChecking for core components...');
  
  // Define core components that should have examples
  const coreComponents = {
    'autocompleteSelect': {
      label: 'AutocompleteSelect',
      retriever: 'retrievers/autocomplete_demo.sh',
      placeholder: 'Type to search...',
      help: 'Dynamic search component that fetches options as you type'
    }
  };

  // Check if each core component exists
  for (const [type, defaults] of Object.entries(coreComponents)) {
    const hasExample = Object.values(schema).some(comp => comp.type === type);
    
    if (!hasExample) {
      console.log(`Adding example for core component: ${type}`);
      
      const demoId = `demo_${type}_default`;
      schema[demoId] = {
        type: type,
        name: demoId,
        label: defaults.label,
        retriever: defaults.retriever,
        placeholder: defaults.placeholder,
        help: defaults.help
      };
    }
  }
}

// Main execution
try {
  console.log('Generating Drona Demo Environment with Mock Retrievers\n');

  console.log('Extracting component types from index.js...');
  const componentTypeMap = extractComponentsMap();

  console.log('\nGenerating Schema.json with examples...');
  const schema = generateSchema(componentTypeMap);

  // Ensure we have examples for core components
  ensureCoreComponentsExist(schema);

  // Ensure we have referenced fields for retrievers that use parameters
  ensureReferencedFieldsExist(schema);

  // Add a demo with parameters if none exists
  ensureDynamicWithParamsExists(schema);

  // Create mock retrievers for all dynamic components
  const retrieverCount = createMockRetrievers(schema);

  console.log('\nGenerating Map.json...');
  const map = generateMap(schema);

  console.log('\nGenerating driver.sh...');
  const driverScript = generateDriverScript(retrieverCount);

  // Write all files
  fs.writeFileSync(
    path.join(DEMO_OUTPUT_DIR, 'schema.json'),
    JSON.stringify(schema, null, 2)
  );

  fs.writeFileSync(
    path.join(DEMO_OUTPUT_DIR, 'map.json'),
    JSON.stringify(map, null, 2)
  );

  fs.writeFileSync(
    path.join(DEMO_OUTPUT_DIR, 'driver.sh'),
    driverScript,
    { mode: 0o755 } // Make the script executable
  );

  console.log(`
==============================================
Demo environment successfully generated in ${DEMO_OUTPUT_DIR}:
==============================================

- Schema.json: Contains all form elements with examples from JSDoc
- Map.json: Contains mappings for form values
- driver.sh: Script to display form values and explain dynamic content
- retrievers/: Contains ${retrieverCount} mock retriever scripts for dynamic components

The environment demonstrates both static and dynamic components,
including parameterized retrievers that use form values.

You can use this environment to test all available form components.
`);
} catch (error) {
  console.error('Error generating demo environment:', error);
  process.exit(1);
}
