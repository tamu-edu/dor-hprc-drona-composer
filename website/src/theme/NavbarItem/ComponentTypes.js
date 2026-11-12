// Adds the site's own navbar item types to Docusaurus's: "custom-schemePicker" is the colour
// scheme menu (src/components/SchemePicker.js).
import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import SchemePicker from '@site/src/components/SchemePicker';

export default {
  ...ComponentTypes,
  'custom-schemePicker': SchemePicker,
};
