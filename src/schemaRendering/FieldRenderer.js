import React, { useMemo } from 'react';
import { componentsMap, RowContainer, UnknownElement } from "./schemaElements/index.js"

const FieldRenderer = ({
  fields,
  handleValueChange,
  labelOnTop,
  fieldStyles,
  setError
}) => {
  if (!fields) return null;
  const renderField = useMemo(() => (field) => {
    if (!field || !field.isVisible) return null;

    const { type, name, condition, elements, value, ...attributes } = field;
    const Element = componentsMap[type];

    if (type === "rowContainer" && elements) {
      return (
        <div key={name} className={fieldStyles}>
          <RowContainer
            key={name}
            name={name}
            elements={elements}
            value={value}
            {...attributes}
            onChange={handleValueChange}
            labelOnTop={labelOnTop}
            fieldStyles={fieldStyles}
            setError={setError}
          />
        </div>
      );
    }

    if (type === "dynamicSelect") {
      attributes.isShown = true;
    }

    if (Element) {
      return (
        <div key={name} className={fieldStyles}>
          <Element
            key={name}
            name={name}
            labelOnTop={labelOnTop}
            value={value}
            {...attributes}
            setError={setError}
            onChange={(_, val) => handleValueChange(name, val)}
          />
        </div>
      );
    }

    return (
      <div key={name} className={fieldStyles}>
        <UnknownElement
          key={name}
          name={name}
          labelOnTop={labelOnTop}
          type={type}
          {...attributes}
        />
      </div>
    );
  }, [handleValueChange, fieldStyles, labelOnTop, setError]);

  const renderElements = useMemo(() => {
    return fields.map(field => renderField(field)).filter(Boolean);
  }, [fields, renderField]);

  return <>{renderElements}</>;
};

// Custom comparison function for React.memo
const areEqual = (prevProps, nextProps) => {
  return (
    prevProps.fields === nextProps.fields &&
    prevProps.handleValueChange === nextProps.handleValueChange
  );
};

export default React.memo(FieldRenderer, areEqual);
