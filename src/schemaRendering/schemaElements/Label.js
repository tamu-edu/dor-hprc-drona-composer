import React from 'react';
  
const Label = ({ labelOnTop, name, label, help }) => {
  return(
    <label
  	className={`form-control-label ${labelOnTop ? "col-form-label" : "col-lg-3 col-form-label"}`}
 	htmlFor={name}
    >
      {label}
      {help && (
        <span
           style={{
   		marginLeft: '3px',
    		fontSize: '0.75em',
    		color: '#007bff', // Link-like color (blue)
    		opacity: 0.6,
    		cursor: 'pointer',
    		transition: 'opacity 0.1s ease',
    		display: 'inline-flex',
    		justifyContent: 'center',
    		alignItems: 'center',
    		border: '1px solid #007bff', // Circle border color matching the link color
    		borderRadius: '50%', // Make it circular
    		padding: '2px', // Adjust padding to create space around the character
    		width: '1.2em', // Ensure the circle is uniform
   		 height: '1.2em',
    		boxSizing: 'border-box', // Ensure padding and border are considered in size
  	  }}		    
          title={help}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
        >   
          ? 
        </span>
      )}    
    </label>
  );      
};        
        
export default Label;
