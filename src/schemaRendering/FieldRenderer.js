import React, { useMemo } from 'react';
import { componentsMap, RowContainer, UnknownElement, Containers } from "./schemaElements/index.js"

// Reserved field: the id of the existing workflow a run acts on. A visible element with
// "workflowTarget": true (the Manage workflow picker) sends its value under this name;
// the backend then runs on that workflow instead of starting a new one.
export const WORKFLOW_TARGET_FIELD = "drona_target_wf";

export const workflowTargetValue = (value) => {
  const raw = value && typeof value === "object" ? value.value : value;
  return raw === undefined || raw === null ? "" : String(raw).trim();
};

const FieldRenderer = ({
  fields,
  handleValueChange,
  labelOnTop,
  fieldStyles,
  setError,
  locationProps = {}
}) => {
  if (!fields) return null;
  const renderField = useMemo(() => (field) => {
    if (!field || !field.isVisible) return null;

    const { type, name, condition, elements, value, workflowTarget, ...attributes } = field;
    const targetValue = workflowTarget ? workflowTargetValue(value) : "";
    const targetInput = targetValue
      ? <input type="hidden" name={WORKFLOW_TARGET_FIELD} value={targetValue} readOnly />
      : null;
    const Element = componentsMap[type];

    if (Containers.includes(type) && elements) {
      return (
        <div key={name} className={fieldStyles}>
          <Element
            key={name}
            name={name}
            elements={elements}
            value={value}
            {...attributes}
            onChange={handleValueChange}
            labelOnTop={labelOnTop}
            fieldStyles={fieldStyles}
            setError={setError}
            {...locationProps}
            locationProps={locationProps}
          />
        </div>
      );
    }

    if (type === "dynamicSelect" || type === "dynamicTable") {
      attributes.isShown = true;
    }

    if (Element) {
      // Normalize defaultLocation for picker-like components.
      // Important for Recreate: restored picker values, such as Generic's
      // importscript field, need to be passed back into Picker as its path.
      let extraProps = {};
      let elementKey = name;
    
      if (type === "picker") {
        const restoredValue =
          typeof value === "string"
            ? value
            : value?.value || value?.path || value?.filepath || "";
    
        const schemaDefault =
          attributes.defaultLocation !== undefined
            ? attributes.defaultLocation
            : undefined;
    
        const fallbackFromLocation =
          name === "location"
            ? (locationProps.runLocation ?? "")
            : "";
    
        extraProps.defaultLocation =
          restoredValue ||
          (typeof schemaDefault === "string" ? schemaDefault : "") ||
          fallbackFromLocation;

        const isMultiplePicker = attributes.multiple !== undefined
          && attributes.multiple.toString().toLowerCase() === "true";

        // Some single-select Picker instances initialize internal display
        // state from defaultLocation only on mount, so remount when the
        // restored path changes (needed for Recreate). Multi-select pickers
        // update `value` on every "Add" click, so forcing a remount here
        // would wipe their in-progress selection list after each addition.
        if (!isMultiplePicker) {
          elementKey = `${name}-${extraProps.defaultLocation || ""}`;
        }
      }
    
      return (
        <div key={name} className={fieldStyles}>
          <Element
            key={elementKey}
            name={name}
            labelOnTop={labelOnTop}
            value={value}
            {...attributes}
            {...extraProps}
            setError={setError}
            onChange={(_, val) => handleValueChange(name, val)}
            {...locationProps}
          />
          {targetInput}
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
          {...locationProps}
        />
      </div>
    );
  }, [handleValueChange, fieldStyles, labelOnTop, setError, locationProps]);

  const renderElements = useMemo(() => {
    return fields.map(field => renderField(field)).filter(Boolean);
  }, [fields, renderField]);

  return <>{renderElements}</>;
};

// Custom comparison function for React.memo
const areEqual = (prevProps, nextProps) => {
  return (
    prevProps.fields === nextProps.fields &&
    // prevProps.handleValueChange === nextProps.handleValueChange
    prevProps.handleValueChange === nextProps.handleValueChange &&
    prevProps.locationProps === nextProps.locationProps
  );
};

export default React.memo(FieldRenderer, areEqual);
