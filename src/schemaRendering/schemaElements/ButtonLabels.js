/**
 * @name ButtonLabels
 * @description Sets the text of the two workflow buttons: the form button that generates the
 * scripts ("preview") and the button in the generated-scripts window that runs them ("submit"),
 * plus that window's title ("title").
 * Renders nothing. It applies only while it is visible, so a buttonLabels element inside a
 * mode's container (e.g. manage.schema.json) changes the labels only in that mode. When several
 * are visible the most deeply nested one wins. Without one the defaults are "Generate" / "Run" /
 * "Generated Scripts".
 *
 * @example
 * // In manage.schema.json: label the buttons for running actions
 * {
 *   "drona_buttons": {
 *     "type": "buttonLabels",
 *     "preview": "Generate action",
 *     "submit": "Run action",
 *     "title": "Action Preview"
 *   }
 * }
 *
 * @property {string} [preview] - Text of the form button that generates the scripts
 * @property {string} [submit] - Text of the button that runs the generated scripts
 * @property {string} [title] - Title of the window that shows the generated scripts
 * @property {string} [condition] - Same as other elements; the labels apply only while it is true
 */

function ButtonLabels() {
  return null;
}

export default ButtonLabels;
