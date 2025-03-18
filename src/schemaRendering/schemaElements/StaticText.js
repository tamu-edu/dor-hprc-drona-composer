import React from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function StaticText(props) {
  const createMarkup = (html) => {
    return { __html: html };
  };

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div className="py-2">
        {props.allowHtml ? (
          <div 
            className={`${props.isHeading ? 'text-xl font-bold' : ''}`}
            dangerouslySetInnerHTML={createMarkup(props.value)}
          />
        ) : (
          <span className={`${props.isHeading ? 'text-xl font-bold' : ''}`}>
            {props.value}
          </span>
        )}
      </div>
    </FormElementWrapper>
  );
}

export default StaticText;
