import React from "react";

/**
 * Stands in for a dynamic choice element that has only one option (`hideWhenSingle`): shows the
 * option's label as plain text and keeps the value in a hidden input so it is still submitted.
 */
function SingleOptionValue({ name, option, withLabelInput = false }) {
  return (
    <>
      <span>{option.label}</span>
      <input type="hidden" name={name} value={option.value} />
      {withLabelInput && <input type="hidden" name={`${name}_label`} value={option.label} />}
    </>
  );
}

export default SingleOptionValue;
