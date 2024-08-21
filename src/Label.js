import React from 'react';

const Label = ({ name, label }) => {
  return (
    <label
      className="col-lg-3 col-form-label form-control-label"
      htmlFor={name}
    >
      {label}
    </label>
  );
};

export default Label;
