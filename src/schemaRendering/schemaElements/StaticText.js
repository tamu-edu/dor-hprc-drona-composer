import React from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function StaticText(props) {
  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div className="py-2">
        <span className={`${props.isHeading ? 'text-xl font-bold' : ''}`}>
          {props.value}
        </span>
      </div>
    </FormElementWrapper>
  );
}

export default StaticText;
