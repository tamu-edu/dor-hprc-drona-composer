export const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: state.isDisabled ? "#e9ecef" : "#fff",
    borderColor: state.isFocused ? "#80bdff" : "#ced4da",
    borderRadius: ".25rem",
    minHeight: "38px",
    boxShadow: state.isFocused ? "0 0 0 .2rem rgba(0,123,255,.25)" : "none",
    fontSize: "1rem",
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 2,
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#495057",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#e9ecef" : "#fff",
    color: "#495057",
    padding: "8px 12px",
    "&:hover": {
      backgroundColor: "#e9ecef",
    },
    ...state.data.styles,
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: "4px",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#6c757d",
  }),
};
