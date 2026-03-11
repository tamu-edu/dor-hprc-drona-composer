import React, { useState } from 'react';
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
}