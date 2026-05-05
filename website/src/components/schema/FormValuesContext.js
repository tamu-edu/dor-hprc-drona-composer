import { createContext } from 'react';

export const FormValuesContext = createContext({
  values: [],  
  updateValue: () => {}  
});
