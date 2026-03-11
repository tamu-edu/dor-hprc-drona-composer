#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Extracts JSDoc comments from JavaScript/JSX files
 */
function extractJSDocFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to match JSDoc comments
  const jsdocRegex = /\/\*\*\s*\n([\s\S]*?)\*\//g;
  const matches = content.match(jsdocRegex);
  
  if (!matches) return null;
  
  // Parse the JSDoc comment
  const jsdocComment = matches[0];
  const lines = jsdocComment.split('\n').map(line => line.replace(/^\s*\*\s?/, '').trim());
  
  const result = {
    name: '',
    description: '',
    examples: [],
    properties: [],
    rawComment: jsdocComment
  };
  
  let currentSection = 'description';
  let currentExample = '';
  let currentProperty = null;
  
  for (const line of lines) {
    if (line.startsWith('@name ')) {
      result.name = line.replace('@name ', '');
    } else if (line.startsWith('@description ')) {
      result.description = line.replace('@description ', '');
      currentSection = 'description';
    } else if (line.startsWith('@example')) {
      if (currentExample) {
        result.examples.push(currentExample.trim());
      }
      currentExample = '';
      currentSection = 'example';
    } else if (line.startsWith('@property ')) {
      if (currentProperty) {
        result.properties.push(currentProperty);
      }
      const propertyMatch = line.match(/@property\s+\{([^}]+)\}\s+(\[?[^\]]+\]?)\s*-?\s*(.*)/);
      if (propertyMatch) {
        currentProperty = {
          type: propertyMatch[1],
          name: propertyMatch[2],
          description: propertyMatch[3]
        };
      }
    } else if (line.startsWith('/**') || line.startsWith('*/') || line === '') {
      continue;
    } else {
      if (currentSection === 'description' && result.description && !line.startsWith('@')) {
        result.description += ' ' + line;
      } else if (currentSection === 'example' && !line.startsWith('@')) {
        currentExample += line + '\n';
      } else if (currentProperty && !line.startsWith('@')) {
        currentProperty.description += ' ' + line;
      }
    }
  }
  
  // Add the last example and property
  if (currentExample) {
    result.examples.push(currentExample.trim());
  }
  if (currentProperty) {
    result.properties.push(currentProperty);
  }
  
  return result;
}

/**
 * Extracts JSON configuration from JSDoc examples
 */
function extractConfigFromExamples(examples) {
  const configs = [];
  
  for (const example of examples) {
    try {
      // Remove comments and extract JSON
      const jsonMatch = example.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0]
          .replace(/\/\/.*$/gm, '')  // Remove line comments
          .replace(/\/\*[\s\S]*?\*\//g, '');  // Remove block comments
        
        const config = JSON.parse(jsonStr);
        configs.push(config);
      }
    } catch (error) {
      console.log(`    ⚠ Could not parse example JSON: ${error.message}`);
    }
  }
  
  return configs;
}

/**
 * Converts JSDoc data to Markdown format
 */
function convertToMarkdown(jsdocData, componentFileName) {
  let markdown = `## ${jsdocData.name}\n\n`;
  
  if (jsdocData.description) {
    markdown += `${jsdocData.description}\n\n`;
  }
  
  // Add properties section
  if (jsdocData.properties.length > 0) {
    markdown += `### Properties\n`;
    for (const prop of jsdocData.properties) {
      const isOptional = prop.name.includes('[') && prop.name.includes(']');
      const cleanName = prop.name.replace(/[\[\]]/g, '');
      const optionalText = isOptional ? ', optional' : '';
      markdown += `- \`${cleanName}\` (${prop.type}${optionalText}) - ${prop.description}\n`;
    }
    markdown += '\n';
  }
  
  // Add examples section
  if (jsdocData.examples.length > 0) {
    markdown += `### Example${jsdocData.examples.length > 1 ? 's' : ''}\n`;
    jsdocData.examples.forEach((example, index) => {
      if (jsdocData.examples.length > 1) {
        markdown += `#### Example ${index + 1}\n`;
      }
      markdown += '```json\n' + example + '\n```\n\n';
    });
  }
  
  markdown += `*Source: \`src/schemaRendering/schemaElements/${componentFileName}\`*\n\n---\n\n`;
  
  return markdown;
}

/**
 * Copies component files to Docusaurus and creates dynamic loader
 */
function setupDocusaurusComponents() {
  const srcDir = path.join(__dirname, '..', 'src', 'schemaRendering');
  const destDir = path.join(__dirname, '..', 'website', 'src', 'components', 'schema');
  
  // Create destination directory
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  // Copy entire schemaRendering directory structure
  const copyDirRecursive = (src, dest) => {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        copyDirRecursive(srcPath, destPath);
      } else if (entry.name.endsWith('.js') && !entry.name.includes('test')) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  
  copyDirRecursive(srcDir, destDir);
  
  // Create component loader with better error handling and simplified components
  const loaderCode = `import React, { useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import individual components that work in Docusaurus
import Text from './schema/schemaElements/Text';
import Number from './schema/schemaElements/Number';
import Checkbox from './schema/schemaElements/Checkbox';
import RadioGroup from './schema/schemaElements/RadioGroup';
import TextArea from './schema/schemaElements/TextArea';
import Select from './schema/schemaElements/Select';
import Time from './schema/schemaElements/Time';
import Unit from './schema/schemaElements/Unit';
import StaticText from './schema/schemaElements/StaticText';

// Mock components for those that require external dependencies
const MockDynamicSelect = (props) => (
  <div className="alert alert-info">
    <strong>DynamicSelect Demo</strong><br/>
    This component requires server-side retriever scripts.<br/>
    <small>In production, this would fetch options from: {props.retriever}</small>
  </div>
);

const MockPicker = (props) => (
  <div className="alert alert-info">
    <strong>Picker Demo</strong><br/>
    This component provides file/directory browsing functionality.<br/>
    <small>Label: {props.localLabel}</small>
  </div>
);

const MockUploader = (props) => (
  <div className="alert alert-info">
    <strong>Uploader Demo</strong><br/>
    This component handles file uploads.<br/>
    <small>Multiple files: {props.multiple ? 'Yes' : 'No'}</small>
  </div>
);

const MockModule = (props) => (
  <div className="alert alert-info">
    <strong>Module Demo</strong><br/>
    This component provides HPC module selection.<br/>
    <small>Toolchains: {props.toolchains?.map(t => t.label).join(', ')}</small>
  </div>
);

const MockAutocompleteSelect = (props) => (
  <div className="alert alert-info">
    <strong>AutocompleteSelect Demo</strong><br/>
    This component provides search-based dropdown functionality.<br/>
    <small>Retriever: {props.retriever}</small>
  </div>
);

const MockCollapsibleRowContainer = (props) => (
  <div className="alert alert-info">
    <strong>CollapsibleRowContainer Demo</strong><br/>
    This component provides collapsible layout functionality.<br/>
    <small>Title: {props.title}</small>
  </div>
);

const MockRowContainer = (props) => (
  <div className="alert alert-info">
    <strong>RowContainer Demo</strong><br/>
    This component arranges multiple form elements in a row.<br/>
    <small>Elements: {Object.keys(props.elements || {}).join(', ')}</small>
  </div>
);

// Component registry
const componentsMap = {
  text: Text,
  number: Number,
  checkbox: Checkbox,
  radioGroup: RadioGroup,
  textarea: TextArea,
  select: Select,
  time: Time,
  unit: Unit,
  staticText: StaticText,
  // Mock components
  dynamicSelect: MockDynamicSelect,
  picker: MockPicker,
  uploader: MockUploader,
  module: MockModule,
  autocompleteSelect: MockAutocompleteSelect,
  collapsibleRowContainer: MockCollapsibleRowContainer,
  rowContainer: MockRowContainer,
};

export default function FormComponentDemo({ type, config, children }) {
  const Component = componentsMap[type];
  
  if (!Component) {
    return (
      <div className="alert alert-warning">
        <strong>Demo not available</strong> for component type "{type}".
        <br />Available types: {Object.keys(componentsMap).join(', ')}
      </div>
    );
  }

  return (
    <BrowserOnly fallback={<div>Loading component demo...</div>}>
      {() => (
        <div className="border rounded p-4 my-4" style={{ 
          backgroundColor: '#f8f9fa',
          borderColor: '#6f42c1',
          borderWidth: '2px'
        }}>
          <div className="d-flex align-items-center mb-3">
            <span className="badge bg-primary me-2">{type}</span>
            <h6 className="mb-0 text-muted">Interactive Demo</h6>
          </div>
          
          <Component 
            {...config} 
            onChange={() => {}} 
            setError={() => {}}
            isShown={true}
          />
          
          {children && (
            <div className="mt-3 p-3 bg-white rounded">
              <div className="text-muted small">
                {children}
              </div>
            </div>
          )}
          
          <div className="mt-3 pt-3 border-top">
            <details className="small">
              <summary className="text-muted mb-2" style={{cursor: 'pointer'}}>
                View configuration JSON
              </summary>
              <pre className="bg-dark text-light p-2 rounded" style={{fontSize: '0.8em'}}>
                <code>{JSON.stringify(config, null, 2)}</code>
              </pre>
            </details>
          </div>
        </div>
      )}
    </BrowserOnly>
  );
}`;

  const loaderPath = path.join(__dirname, '..', 'website', 'src', 'components', 'FormComponentDemo.js');
  fs.writeFileSync(loaderPath, loaderCode, 'utf8');
  
  console.log('✓ Copied all component files to Docusaurus');
  console.log('✓ Created dynamic component loader using existing registry');
}

/**
 * Main function to extract JSDoc from all schema elements
 */
function extractAllJSDoc() {
  // First, set up the component copying
  
  const schemaElementsDir = path.join(__dirname, '..', 'src', 'schemaRendering', 'schemaElements');
  const outputFile = path.join(__dirname, '..', 'website', 'docs', 'frontend', 'form-components.md');
  
  // Read all JavaScript files in the schema elements directory
  const files = fs.readdirSync(schemaElementsDir)
    .filter(file => file.endsWith('.js') && !file.includes('test') && file !== 'index.js' && file !== 'UnknownElement.js')
    .sort();
  
  let markdownContent = `---
sidebar_position: 2
---

# Form Components

Documentation for all form components in the Drona Composer system. Components are used in JSON schema files by specifying the appropriate \`type\` field.

## Common Properties

All form components share a set of standard properties that control basic behavior, display, and validation:

### Required Properties
- **\`type\`** (string) - Determines which component to render (e.g., "text", "select", "checkbox")
- **\`name\`** (string) - Field identifier used for form submission and value storage

### Standard Properties
- **\`label\`** (string, optional) - Display label for the field
- **\`help\`** (string, optional) - Help text displayed below the field
- **\`value\`** (any, optional) - Default or initial value for the field

### Layout Properties
- **\`labelOnTop\`** (boolean, optional) - When true, positions label above the input instead of beside it

### Conditional Display
- **\`isVisible\`** (boolean, optional) - Controls whether the field is displayed (evaluated before rendering)
- **\`condition\`** (object, optional) - Conditional expression object that determines field visibility based on other field values

### Example with Common Properties
\`\`\`json
{
  "type": "text",
  "name": "username",
  "label": "User Name",
  "value": "john_doe",
  "help": "Enter your username",
  "labelOnTop": true,
  "isVisible": true
}
\`\`\`

---

## Component Reference

Each component below supports all common properties listed above, plus component-specific properties.

`;

  console.log('Extracting JSDoc from form components...');
  
  for (const file of files) {
    const filePath = path.join(schemaElementsDir, file);
    console.log(`Processing: ${file}`);
    
    try {
      const jsdocData = extractJSDocFromFile(filePath);
      
      if (jsdocData && jsdocData.name) {
        markdownContent += convertToMarkdown(jsdocData, file);
        console.log(`  ✓ Extracted documentation for ${jsdocData.name}`);
      } else {
        console.log(`  ⚠ No JSDoc found in ${file}`);
      }
    } catch (error) {
      console.log(`  ✗ Error processing ${file}:`, error.message);
    }
  }
  
  // Add footer content
  markdownContent += `
`;

  // Write the markdown file
  fs.writeFileSync(outputFile, markdownContent, 'utf8');
  console.log(`\n✓ Documentation written to: ${outputFile}`);
  console.log(`✓ Total components documented: ${files.length}`);
}

// Run the extraction
if (require.main === module) {
  extractAllJSDoc();
}

module.exports = { extractJSDocFromFile, convertToMarkdown, extractAllJSDoc };
