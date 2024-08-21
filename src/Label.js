import React from 'react';
  
const Label = ({ name, label, help }) => {
  return (
    <label className="col-lg-3 col-form-label form-control-label" htmlFor={name}>
      {label}
            {help && (
        <span
          style={{
            marginLeft: '3px',
            fontSize: '0.75em',
            color: 'inherit',
            opacity: 0.6,
            cursor: 'pointer',
            transition: 'opacity 0.1s ease',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            transform: 'translateY(2px)',
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
