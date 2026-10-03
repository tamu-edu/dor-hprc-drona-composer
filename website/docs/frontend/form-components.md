---
sidebar_position: 2
---

# Form Components

Documentation for all form components in the Drona Composer system. Components are used in JSON schema files by specifying the appropriate `type` field.

## Common Properties

All form components share a set of standard properties that control basic behavior, display, and validation:

### Required Properties
- **`type`** (string) - Determines which component to render (e.g., "text", "select", "checkbox")
- **`name`** (string) - Field identifier used for form submission and value storage

### Standard Properties
- **`label`** (string, optional) - Display label for the field
- **`help`** (string, optional) - Help text displayed below the field
- **`value`** (any, optional) - Default or initial value for the field

### Layout Properties
- **`labelOnTop`** (boolean, optional) - When true, positions label above the input instead of beside it

### Conditional Display
- **`isVisible`** (boolean, optional) - Controls whether the field is displayed (evaluated before rendering)
- **`condition`** (object, optional) - Conditional expression object that determines field visibility based on other field values

### Example with Common Properties
```json
{
  "type": "text",
  "name": "username",
  "label": "User Name",
  "value": "john_doe",
  "help": "Enter your username",
  "labelOnTop": true,
  "isVisible": true
}
```

---

## Choice element styling

`radioGroup`, `dynamicRadioGroup`, `checkboxGroup` and `dynamicCheckboxGroup` share two styling props.

- `style` sets the appearance of each option: `"default"` (standard input and label) or `"button"` (toggle buttons; works for checkboxes as well as radios).
- `layout` sets how the whole group is arranged and framed. It takes a preset name, an object, or an array mixing these:
  - `"inline"` (default), `"list"` (one option per row), `"grid"` (auto-fitting columns), `"boxed"` (border, radius and padding matching the text inputs), `"card"` (rounded card like the Slurm job queue panel: the title is a pill on the top border, with an optional pulsing green dot).
  - A preset with params: `{ "preset": "boxed", "title": "Running jobs" }`. `boxed` accepts `title`; `card` accepts `title` and `dot` (default `true`, set `false` to hide the green dot); `grid` accepts `minWidth` (default `"12rem"`). Unsupported params are ignored with a console warning.
  - A bare CSS object (camelCase keys) applied to the group container: `{ "maxHeight": "220px", "overflowY": "auto" }`. With `card` it applies to the option area inside the card, so the title stays put when the list scrolls.

`container`, `rowContainer` and `staticText` accept the same `layout` prop, limited to `card` and `boxed` (plus a CSS object for the content area); other presets are ignored with a console warning. Without `layout` nothing is drawn around the container. `collapsibleRowContainer` and `collapsibleColContainer` take `layout: "card"` only: the title pill becomes the expand/collapse toggle (a maroon chevron replaces the green dot) and the separate Show/Hide button is dropped. The pill highlights on hover and keyboard focus, and a collapsed card shows a "Click to expand" hint and expands when clicked anywhere on the strip. To hide a whole card, put the `condition` on the container itself, since the card is drawn even if every child is hidden.

Unknown preset names are ignored with a console warning. Titles and labels are rendered as text, never HTML.

A `title` can reference form fields as `$fieldName`, which is replaced by the field's current value (empty when the field has no value), e.g. `{ "preset": "card", "title": "Resource Usage · Job $jobs" }`. This is the same `$` convention as `retrieverParams`. A `$` not followed by a letter or underscore (such as `$5`) is left as written. This works in every element that takes `layout`.

For `staticText` the frame wraps the whole element, including its loading spinner and refresh button. Use it instead of drawing a card and title pill in the retriever's HTML, so the look stays consistent with other elements:

```json
{
  "type": "staticText",
  "name": "drona_sstat2",
  "useLabel": false,
  "isDynamic": true,
  "allowHtml": true,
  "retriever": "drona_slurm_sstat.sh",
  "retrieverParams": { "JOBID": "$jobs" },
  "layout": { "preset": "card", "title": "Resource Usage · Job $jobs" }
}
```

```json
{
  "type": "dynamicCheckboxGroup",
  "name": "drona_cancel_jobs",
  "label": "Cancel jobs",
  "style": "button",
  "layout": [
    { "preset": "card", "title": "Running jobs" },
    "list",
    { "maxHeight": "220px", "overflowY": "auto" }
  ],
  "retriever": "drona_cancelable_jobs.sh"
}
```

## Component Reference

Each component below supports all common properties listed above, plus component-specific properties.

## AutocompleteSelect

A dynamic search-based dropdown component that fetches options as you type. Uses a retriever script to dynamically search for and display matching options based on user input.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `retriever - Path to the script that fetches search results` (string) - 
- `placeholder` (string, optional) - Placeholder text shown in the input field
- `value` (object, optional) - Default/initial selected option (object with value and label)
- `help` (string, optional) - Help text displayed below the input
- `showAddMore=false` (boolean, optional) - Whether to show an add more button

### Example
```json
// Dynamic search dropdown
{
"type": "autocompleteSelect",
"name": "institution",
"label": "AutocompleteSelect",
"retriever": "retrievers/institution_search.sh",
"placeholder": "Search for an institution...",
"help": "Type at least 2 characters to search for institutions"
}
```

*Source: `src/schemaRendering/schemaElements/AutocompleteSelect.js`*

---

## Chart

A declarative, self-contained live chart backed by Recharts. Polls a retriever script on an interval (like `staticText`) and renders line/bar/area/pie charts from whatever JSON it returns — no JSX or hand-written JS required, every aspect of the chart (type, axes, series, colors) is controlled by plain JSON properties. The retriever may emit a JSON array of samples (replaces the rolling window each poll — the recommended `tail -n <N>` pattern) or a single JSON sample object (appended to an in-memory buffer capped at `maxDataPoints`). Set `series: "auto"` to derive series from whatever keys show up in each sample when the metric set isn't known until runtime (e.g. GPU count varies per job), or pass an explicit array when metric names are fixed and known ahead of time. See the "Live Charts" guide under Environment Development > Advanced Features for the full retriever contract, data-format examples, and suggested retriever scripts. A single poll can also be split across multiple side-by-side panels instead of one combined chart — see `panels` (explicit, for grouping semantically different metrics like GPU % vs. memory GB, each with its own y-axis) and `seriesPerPanel` (automatic, for capping how many lines land in one panel when the series count isn't known ahead of time, e.g. `series: "auto"` with a variable GPU count). Both still poll the retriever exactly once per interval regardless of panel count. If both are given, `panels` wins and `seriesPerPanel` is ignored.

### Properties
- `name - Component name` (string) - 
- `label` (string, optional) - Display label
- `labelOnTop=false` (boolean, optional) - Label above vs. beside the chart
- `help` (string, optional) - Help text below the chart
- `chartType="line"` ("line"|"bar"|"area"|"pie", optional) - Chart type. Applies to the single pane, or uniformly to every `seriesPerPanel`-generated panel; ignored for `panels` entries that set their own `chartType`.
- `retriever - Path to the retriever script` (string) - 
- `retrieverParams` (Object, optional) - Params passed to the script, `$fieldName` values are substituted from form state
- `refreshInterval` (number, optional) - Poll interval in seconds. Omit/0 to fetch once on mount only. Paused while the browser tab is hidden; a poll is skipped if the previous one is still running. A failed poll keeps the chart with an inline "Refresh failed" note, and only raises the global error after several failures in a row.
- `refreshWhile` (string, optional) - Condition (same syntax as `condition`); polling only runs while it is true, with one final fetch when it turns false, e.g. "!drona_status.DONE"
- `maxDataPoints=120` (number, optional) - Rolling window cap (client-side safety net, applied regardless of what the retriever returns)
- `series="auto"` (string|Array, optional) - "auto" to derive series from sample keys, or an array of `{key, label, color}` objects for fixed, known metrics
- `seriesLabelMap` (Object, optional) - `{key: label}` overrides for auto-derived series labels
- `colors` (string[], optional) - Override the default 8-color sequence used for auto series
- `xAxis` (Object, optional) - `{key="timestamp", label, format, unit}`. `format`: "time"|"date"|"datetime" applies a built-in formatter; `unit`: "s"|"ms" (default "s") for timestamp values.
- `yAxis` (Object, optional) - `{label, min, max}`
- `stacked=false` (boolean, optional) - Stack series (bar/area only)
- `height=300` (number, optional) - Chart height in pixels. Applies per-panel when `panels`/`seriesPerPanel` is used, unless a `panels` entry overrides it.
- `showLegend=true` (boolean, optional) - Show legend when there are 2+ series in a given pane
- `showGrid=true` (boolean, optional) - Show gridlines
- `showTable=false` (boolean, optional) - Show a "view as table" toggle below the chart (accessibility fallback). With `panels`/`seriesPerPanel`, one combined table covers every series across all panels.
- `emptyMessage="No data yet"` (string, optional) - Message shown before the first sample arrives
- `panels` (Array<Object>, optional) - Explicit, manual panel split from one shared poll: `{title, series, seriesLabelMap, colors, chartType, yAxis, stacked, showLegend, showGrid, height}` per panel. `series` is required per panel (usually an explicit `{key,label,color}` array, since the point is hand-grouping known keys by meaning). Omitted per-panel options fall back to the top-level prop of the same name. Takes precedence over `seriesPerPanel` if both are set.
- `seriesPerPanel` (number, optional) - Automatic split: chunks the series derived from the top-level `series` prop (auto or explicit) into groups of this size, one panel per group, in first-seen order. Panel count adjusts as new keys appear in the data. Ignored if `panels` is set.

### Examples
#### Example 1
```json
// Dynamic series line chart — GPU utilization, GPU count unknown ahead of time
{
"type": "chart",
"name": "gpuUtilization",
"label": "GPU Utilization",
"chartType": "line",
"retriever": "retrievers/gpu_utilization_retriever.sh",
"retrieverParams": { "jobId": "$jobId" },
"refreshInterval": 10,
"maxDataPoints": 120,
"xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
"yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 },
"series": "auto",
"help": "Live GPU utilization — one line per GPU reported"
}
```

#### Example 2
```json
// Explicit series — fixed, known metric names
{
"type": "chart",
"name": "trainingMetrics",
"label": "Training Progress",
"chartType": "line",
"retriever": "retrievers/training_log_retriever.sh",
"retrieverParams": { "jobId": "$jobId" },
"refreshInterval": 15,
"maxDataPoints": 200,
"xAxis": { "key": "epoch", "label": "Epoch" },
"series": [
{ "key": "loss", "label": "Loss", "color": "#e34948" },
{ "key": "accuracy", "label": "Accuracy", "color": "#1baf7a" }
]
}
```

#### Example 3
```json
// Stacked bar chart
{
"type": "chart",
"name": "diskIO",
"label": "Disk I/O",
"chartType": "bar",
"stacked": true,
"retriever": "retrievers/disk_io_retriever.sh",
"retrieverParams": { "jobId": "$jobId" },
"refreshInterval": 10,
"xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
"series": [
{ "key": "read", "label": "Read (MB/s)" },
{ "key": "write", "label": "Write (MB/s)" }
]
}
```

#### Example 4
```json
// Pie chart snapshot — dynamic series (per-rank memory, rank count unknown)
{
"type": "chart",
"name": "memoryByRank",
"label": "Memory Usage by Rank",
"chartType": "pie",
"retriever": "retrievers/memory_by_rank_retriever.sh",
"retrieverParams": { "jobId": "$jobId" },
"refreshInterval": 10,
"series": "auto",
"help": "Current memory usage per MPI rank"
}
```

#### Example 5
```json
// Explicit panels — two semantically different metric families, one shared poll,
// each with its own y-axis (count-based splitting can't do this: it groups by
// discovery order, not by what a key means)
{
"type": "chart",
"name": "gpuAndMemory",
"label": "GPU & Memory",
"retriever": "retrievers/gpu_and_memory_retriever.sh",
"refreshInterval": 10,
"xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
"panels": [
{
"title": "GPU Utilization",
"series": [{ "key": "gpu0" }, { "key": "gpu1" }],
"yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 }
},
{
"title": "Memory Usage",
"chartType": "area",
"series": [{ "key": "mem0" }, { "key": "mem1" }],
"yAxis": { "label": "Memory (GB)", "min": 0, "max": 80 }
}
]
}
```

#### Example 6
```json
// seriesPerPanel — series count unknown ahead of time (auto), capped at 2 lines per panel
{
"type": "chart",
"name": "gpuUtilizationSplit",
"label": "GPU Utilization (split)",
"retriever": "retrievers/gpu_utilization_retriever.sh",
"refreshInterval": 10,
"xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
"yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 },
"series": "auto",
"seriesPerPanel": 2
}
```

*Source: `src/schemaRendering/schemaElements/Chart.js`*

---

## Checkbox

A checkbox input component that returns a specified value when checked and an empty string when unchecked. The checkbox value is customizable and defaults to "Yes" if not specified.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `value="Yes"` (string, optional) - Value to return when the checkbox is checked (defaults to "Yes")
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// Basic checkbox input
{
"type": "checkbox",
"name": "agreeToTerms",
"label": "Checkbox",
"value": "Yes",
"help": "Toggle input that returns a value when checked"
}
```

*Source: `src/schemaRendering/schemaElements/Checkbox.js`*

---

## CheckboxGroup

A checkbox group component that allows users to select multiple options from a list of choices. Displays options horizontally with their labels.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `options - Array of option objects, each with value and label properties` (Array) - 
- `value` (Array, optional) - Default/initial selected values
- `style` (string, optional) - Option appearance: "default" or "button" (button-style options)
- `layout` (string | Object | Array, optional) - Group layout: `"inline"` | `"list"` | `"grid"` | `"boxed"` | `"card"`, a preset with params, a CSS object, or an array of these. See [Choice element styling](#choice-element-styling)
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// Checkbox group with multiple options
{
"type": "checkboxGroup",
"name": "features",
"label": "CheckboxGroup",
"options": [
{ "value": "analytics", "label": "Analytics" },
{ "value": "reporting", "label": "Reporting" },
{ "value": "automation", "label": "Automation" }
],
"value": ["analytics", "reporting"],
"help": "Select one or more options"
}
```

*Source: `src/schemaRendering/schemaElements/CheckboxGroup.js`*

---

## CollapsibleRowContainer

A collapsible container component that organizes form fields in a horizontal row. Features a header with a toggle button to show/hide the content, making complex forms more manageable. Each child element is rendered by the FieldRenderer component in a 100% width layout.

### Properties
- `elements - Object of field configuration objects to be rendered in the container` (Object) - 
- `title="Collapsible Row Container"` (string, optional) - Title displayed in the container header
- `default_state="expanded"` (('collapsed'|'expanded'), optional) - Initial visibility state
- `layout` (string | Object, optional) - `"card"` draws a rounded card whose title pill is the toggle (chevron, no separate button); the pill text is the layout `title`, else the `title` prop. Unset keeps the default header and Show/Hide button. See [Choice element styling](#choice-element-styling)

### Example
```json
// Collapsible container with multiple form elements
{
"type": "collapsibleRowContainer",
"title": "Personal Information",
"elements": {
"firstName": {
"type": "text",
"name": "firstName",
"label": "First Name",
"placeholder": "Enter first name"
},
"lastName": {
"type": "text",
"name": "lastName",
"label": "Last Name",
"placeholder": "Enter last name"
},
"email": {
"type": "text",
"name": "email",
"label": "Email Address",
"placeholder": "Enter email address"
}
}
}
```

*Source: `src/schemaRendering/schemaElements/CollapsibleContainer.js`*

---

## Container

A layout component that organizes form fields in a vertical row. It wraps multiple form elements in a responsive grid layout, with each child element rendered by the FieldRenderer component in a row format.

### Properties
- `elements - Array of field configuration objects to be rendered in the row` (Array) - 
- `layout` (string | Object | Array, optional) - Optional frame around the container: `"card"` or `"boxed"`, e.g. `{ "preset": "card", "title": "Job Resources" }`. See [Choice element styling](#choice-element-styling). Unset renders no frame

### Example
```json
// Row with multiple text fields
{
"type": "container",
"elements": {
"element1": {
"type": "text",
"name": "element1",
"label": "Container1",
"placeholder": "Enter text"
},
"element2": {
"type": "text",
"name": "element1",
"label": "Container1",
"placeholder": "Enter text"
},
"element3": {
"type": "text",
"name": "element1",
"label": "Container1",
"placeholder": "Enter text"
}
}
}
```

*Source: `src/schemaRendering/schemaElements/Container.js`*

---

## DragDropContainer

A visual drag-and-drop form builder component that allows users to construct forms by dragging elements from a palette and dropping them into a workspace. Supports reordering elements, editing properties, and removing elements. Built with @dnd-kit for smooth drag-and-drop interactions.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `title="Drag & Drop Builder"` (string, optional) - Title displayed in the builder header
- `availableElements=` (Array, optional) - ] - Array of element type names available in the palette
- `elementTemplates={}` (Object, optional) - Configuration templates for each element type, with label, description, and config
- `allowEdit=true` (boolean, optional) - Whether users can edit element properties after dropping
- `elements={}` (Object|Array, optional) - Initial elements to display in the drop zone
- `value` (string, optional) - JSON string of initial elements (alternative to elements prop)
- `help` (string, optional) - Help text displayed below the builder

### Example
```json
// Basic drag-drop builder with text and number elements
{
"type": "dragDropContainer",
"name": "formBuilder",
"label": "Form Builder",
"title": "Drag & Drop Form Builder",
"availableElements": ["text", "number", "select", "checkbox"],
"elementTemplates": {
"text": {
"label": "Text Input",
"description": "Single line text field",
"config": { "type": "text", "placeholder": "Enter text" }
},
"number": {
"label": "Number Input",
"description": "Numeric input field",
"config": { "type": "number", "min": 0 }
}
},
"allowEdit": true,
"help": "Drag elements from the palette to build your form"
}
```

*Source: `src/schemaRendering/schemaElements/DragDropContainer.js`*

---

## DynamicCheckboxGroup

A checkbox group that dynamically loads its options from a retriever script. Allows multiple selections and automatically refreshes options when dependent form values change. Warns when previously selected options become unavailable and removes invalid selections on user interaction.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `retriever - Path to the script that retrieves checkbox options` (string) - 
- `retrieverParams` (Object, optional) - Parameters passed to the retriever script, values with $ prefix are replaced with form values
- `value` (Array, optional) - Default/initial selected values (array of value strings)
- `options` (Array, optional) - Initial options array, overridden by retriever results
- `pruneMissing` (boolean, optional, default `false`) - Silently drop selected values that are not in the loaded options, without the "no longer available" warning. Meant for action lists such as cancel-jobs
- `style` (string, optional) - Option appearance: "default" or "button" (button-style options)
- `layout` (string | Object | Array, optional) - Group layout: `"inline"` | `"list"` | `"grid"` | `"boxed"` | `"card"`, a preset with params, a CSS object, or an array of these. See [Choice element styling](#choice-element-styling)
- `help` (string, optional) - Help text displayed below the checkboxes

### Examples
#### Example 1
```json
// Basic dynamic checkbox group
{
"type": "dynamicCheckboxGroup",
"name": "selectedModules",
"label": "Available Modules",
"retriever": "retrievers/modules_list.sh",
"value": ["module1", "module2"],
"help": "Select one or more modules (options loaded dynamically)"
}
```

#### Example 2
```json
// Dynamic checkbox group with parameters from form values
{
"type": "dynamicCheckboxGroup",
"name": "permissions",
"label": "User Permissions",
"retriever": "retrievers/permissions_by_role.sh",
"retrieverParams": { "role": "$userRole", "environment": "production" },
"help": "Permissions update based on selected role"
}
```

*Source: `src/schemaRendering/schemaElements/DynamicCheckboxGroup.js`*

---

## DynamicRadioGroup

A radio button group that dynamically loads its options from a retriever script. Allows single selection and automatically refreshes options when dependent form values change. Warns when the previously selected option becomes unavailable.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `retriever - Path to the script that retrieves radio options` (string) - 
- `retrieverParams` (Object, optional) - Parameters passed to the retriever script, values with $ prefix are replaced with form values
- `value` (string, optional) - Default/initial selected value
- `options` (Array, optional) - Initial options array, overridden by retriever results
- `style` (string, optional) - Option appearance: "default" or "button" (button-style options)
- `layout` (string | Object | Array, optional) - Group layout: `"inline"` | `"list"` | `"grid"` | `"boxed"` | `"card"`, a preset with params, a CSS object, or an array of these. See [Choice element styling](#choice-element-styling)
- `help` (string, optional) - Help text displayed below the radio buttons

### Examples
#### Example 1
```json
// Basic dynamic radio group
{
"type": "dynamicRadioGroup",
"name": "selectedOption",
"label": "Choose One",
"retriever": "retrievers/options_list.sh",
"value": "option1",
"help": "Select one option (options loaded dynamically)"
}
```

#### Example 2
```json
// Dynamic radio group with parameters from form values
{
"type": "dynamicRadioGroup",
"name": "deployment",
"label": "Deployment Target",
"retriever": "retrievers/deployments_by_env.sh",
"retrieverParams": { "environment": "$selectedEnv" },
"help": "Deployment targets update based on selected environment"
}
```

*Source: `src/schemaRendering/schemaElements/DynamicRadioGroup.js`*

---

## DynamicSelect

A dropdown select component that dynamically loads its options from a retriever script. Handles loading states, unavailable options, and provides visual feedback when selected values become invalid. Supports dynamic parameters from form values.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `retriever - Path to the script that retrieves the select options` (string) - 
- `retrieverParams` (Object, optional) - Parameters passed to the script as environment variables, values with $ prefix will be replaced with form values
- `value` (Object, optional) - Default/initial selected option (object with value and label)
- `options` (Array, optional) - Initial options array, may be overridden by retriever
- `help` (string, optional) - Help text displayed below the input
- `showAddMore=false` (boolean, optional) - Whether to show an add more button

### Examples
#### Example 1
```json
// Dynamic select with options loaded from a retriever
{
"type": "dynamicSelect",
"name": "computeNode",
"label": "DynamicSelect",
"retriever": "retrievers/compute_nodes.sh",
"help": "Select a compute node (options loaded dynamically)"
}
```

#### Example 2
```json
// Dynamic select with parameters from form values
{
"type": "dynamicSelect",
"name": "serverList",
"label": "Available Servers",
"retriever": "retrievers/servers_by_region.sh",
"retrieverParams": { "region": "$selectedRegion", "type": "production" },
"help": "Servers will update based on selected region"
}
```

*Source: `src/schemaRendering/schemaElements/DynamicSelect.js`*

---

## DynamicViewer

A sandboxed iframe-based viewer component that can load external CDN libraries and execute custom initialization code. Supports dynamic data fetching via retriever scripts.

### Properties
- `name - Component name for form submission` (string) - 
- `retriever` (string, optional) - Path to retriever script for dynamic data
- `retrieverPath` (string, optional) - Alias for retriever
- `retrieverParams` (Object, optional) - Parameters with $fieldName references for dynamic values
- `value - Viewer configuration object` (Object) - 
- `value.title` (string, optional) - Title displayed in card header
- `value.description` (string, optional) - Description shown under title
- `value.cdnLibraries` (string|string[], optional) - CDN URLs to load (must be from approved sources)
- `value.initCode` (string, optional) - JavaScript code to execute in iframe, or a path to a .js file (e.g. "viewers/myViewer.js") whose content will be fetched and used
- `value.data` (Object, optional) - Static data passed to initCode (overridden by retriever)
- `value.height="600px"` (string, optional) - Iframe height
- `value.footer` (string, optional) - Footer text

### Examples
#### Example 1
```json
// Static data viewer
{
"type": "dynamicViewer",
"name": "proteinViewer",
"value": {
"title": "Protein Viewer",
"cdnLibraries": ["https://3dmol.csb.pitt.edu/build/3Dmol-min.js"],
"initCode": "// Use data variable",
"data": { "pdbId": "1CRN" }
}
}
```

#### Example 2
```json
// Dynamic data viewer with retriever
{
"type": "dynamicViewer",
"name": "proteinViewer",
"retriever": "retrievers/fetch_protein.sh",
"retrieverParams": { "proteinId": "$selectedProtein" },
"value": {
"title": "Protein Viewer",
"cdnLibraries": ["https://3dmol.csb.pitt.edu/build/3Dmol-min.js"],
"initCode": "// data variable contains fetched result"
}
}
```

*Source: `src/schemaRendering/schemaElements/DynamicViewer.js`*

---

## Hidden

Executes dynamic scripts without any visual output. Takes no space and displays nothing, but can execute retriever scripts in the background for side effects.

### Properties
- `name - Component name (required but not visible)` (string) - 
- `value` (string, optional) - Static value (used when no retriever is specified)
- `retriever` (string, optional) - Path to the script file to execute (for dynamic execution)
- `retrieverParams` (Object, optional) - Parameters passed to the script as environment variables
- `refreshInterval` (number, optional) - Auto-execution interval in seconds. Paused while the browser tab is hidden; a poll is skipped if the previous one is still running.
- `refreshWhile` (string, optional) - Condition (same syntax as `condition`); periodic refresh only runs while it is true, with one final refresh when it turns false, e.g. "!drona_status.DONE"
- `setError` (function, optional) - Function to handle errors during script execution

### Examples
#### Example 1
```json
// Execute a script when form values change
{
"type": "hidden",
"name": "backgroundProcess",
"retriever": "retrievers/update_location.sh",
"retrieverParams": { "jobName": "$name" },
"refreshInterval": 5
}
```

#### Example 2
```json
// Static value execution (no dynamic script)
{
"type": "hidden",
"name": "staticAction",
"value": "some_static_value"
}
```

*Source: `src/schemaRendering/schemaElements/Hidden.js`*

---

## JobNameLocation

A composite form component that combines job name input and location picker in a single row layout. Manages both the job name (text input) and working directory location (file picker) with synchronized state. Commonly used in HPC job submission forms.

### Properties
- `showName=true` (boolean, optional) - Whether to display the job name input field
- `showLocation=true` (boolean, optional) - Whether to display the location picker
- `disableJobNameChange=false` (boolean, optional) - Makes the job name field read-only
- `disableJobLocationChange=false` (boolean, optional) - Makes the location picker read-only
- `customJobName` (string, optional) - Pre-filled job name value
- `customJobLocation` (string, optional) - Pre-filled location path
- `label` (string, optional) - Display label for the entire component
- `pickerLabel="Change"` (string, optional) - Label for the location picker button
- `help` (string, optional) - Help text displayed below the component
- `labelOnTop=true` (boolean, optional) - Whether to position label above the fields

### Examples
#### Example 1
```json
// Basic job name and location picker
{
"type": "jobNameLocation",
"label": "Job Configuration",
"showName": true,
"showLocation": true,
"pickerLabel": "Browse",
"help": "Enter job name and select working directory"
}
```

#### Example 2
```json
// With custom defaults and disabled fields
{
"type": "jobNameLocation",
"label": "Job Settings",
"customJobName": "MyJob",
"customJobLocation": "$HOME/jobs",
"disableJobNameChange": true,
"showLocation": true,
"help": "Job name is fixed, but you can change the location"
}
```

*Source: `src/schemaRendering/schemaElements/JobNameLocation.js`*

---

## Module

A module selection component that allows users to search and select software modules from different toolchains. Features autocomplete suggestions from a server, toolchain selection, and visual representation of selected modules as removable badges.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `value` (string, optional) - Default/initial value as space-separated list of modules
- `toolchains - Array of toolchain options, each with value and label properties` (Array) - 
- `toolchainName="toolchain"` (string, optional) - Name for the toolchain select input
- `help` (string, optional) - Help text displayed below the input
- `module_db_root` (string, optional) - Base directory where module database is located

### Example
```json
// Module selection component with multiple toolchains
{
"type": "module",
"name": "moduleList",
"label": "Module",
"value": "gcc/9.3.0 openmpi/4.0.5",
"toolchains": [
{ "value": "modules", "label": "Modules" },
{ "value": "lmod-gcc", "label": "GCC Modules" },
{ "value": "lmod-intel", "label": "Intel Modules" }
],
"toolchainName": "toolchain",
"help": "Search and select software modules for your environment"
}
```

*Source: `src/schemaRendering/schemaElements/Module.js`*

---

## Number

A numeric input field component for collecting numerical values. Supports minimum, maximum, and step value constraints.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `value` (number, optional) - Default/initial value for the input
- `min` (number, optional) - Minimum allowed value
- `max` (number, optional) - Maximum allowed value
- `step=1` (number, optional) - Step value for incrementing/decrementing
- `placeholder` (string, optional) - Placeholder text shown when the field is empty
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// Basic number input
{
"type": "number",
"name": "quantity",
"label": "Number",
"value": 5,
"min": 0,
"max": 100,
"step": 1,
"placeholder": "Enter a number",
"help": "Numeric input with min/max constraints"
}
```

*Source: `src/schemaRendering/schemaElements/Number.js`*

---

## Picker

A file and directory picker component that allows users to browse and select files or directories from both local and remote locations. Features a modal browser interface for navigating directory structures.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `localLabel - Label for the local file browser button` (string) - 
- `remoteLabel` (string, optional) - Label for remote file upload button (if omitted, remote upload option isn't shown)
- `showFiles="false"` (string|boolean, optional) - Whether to show files in directory listings ("true" or "false")
- `allowedFileTypes` (string, optional) - Comma-separated list of file extensions to allow (e.g. "csv,txt,json"); non-matching files are hidden from the browser. Leading dots are optional, matching is case-insensitive, and directories are always shown regardless of this filter.
- `showHidden=true` (string|boolean, optional) - Whether to include dot-prefixed hidden files and directories (e.g. ".git", ".config") in the browser listing ("true" or "false")
- `multiple=false` (string|boolean, optional) - When true, each browse adds one more file/directory to a list instead of replacing a single value. The submitted value becomes a colon-joined string of the chosen full paths (e.g. "/scratch/a:/scratch/b"), matching shell $PATH-style lists. Single-select behavior (a plain path string) is unchanged when this is left unset.
- `defaultLocation` (string, optional) - Default path to show in the input field
- `defaultPaths` (Object, optional) - Custom paths to show as quick access buttons (key:label, value:path)
- `useHPCDefaultPaths=true` (boolean, optional) - Whether to use system default paths
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// File/directory picker with both local and remote options
{
"type": "picker",
"name": "outputLocation",
"label": "Picker",
"localLabel": "Browse Directories",
"remoteLabel": "Upload File",
"showFiles": "true",
"allowedFileTypes": "csv,txt,json",
"defaultLocation": "$HOME",
"defaultPaths": {
"HomeCustom": "$HOME"
},
"useHPCDefaultPaths": true,
"help": "Select a file or directory location"
}
```

*Source: `src/schemaRendering/schemaElements/Picker.js`*

---

## RadioGroup

A radio button group component that allows users to select a single option from a list of choices. Displays options horizontally with their labels.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `options - Array of option objects, each with value and label properties` (Array) - 
- `value` (string, optional) - Default/initial selected value
- `style` (string, optional) - Option appearance: "default" or "button" (button-style options)
- `layout` (string | Object | Array, optional) - Group layout: `"inline"` | `"list"` | `"grid"` | `"boxed"` | `"card"`, a preset with params, a CSS object, or an array of these. See [Choice element styling](#choice-element-styling)
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// Radio button group with multiple options
{
"type": "radioGroup",
"name": "priority",
"label": "RadioGroup",
"style": "button",
"options": [
{ "value": "low", "label": "Low" },
{ "value": "medium", "label": "Medium" },
{ "value": "high", "label": "High" }
],
"value": "medium",
"help": "Select one option from multiple choices"
}
```

*Source: `src/schemaRendering/schemaElements/RadioGroup.js`*

---

## RowContainer

A layout component that organizes form fields in a horizontal row. It wraps multiple form elements in a responsive grid layout, with each child element rendered by the FieldRenderer component in a column format.

### Properties
- `elements - Array of field configuration objects to be rendered in the row` (Array) - 
- `layout` (string | Object | Array, optional) - Optional frame around the container: `"card"` or `"boxed"`, e.g. `{ "preset": "card", "title": "Job Resources" }`. See [Choice element styling](#choice-element-styling). Unset renders no frame

### Example
```json
// Row with multiple text fields
{
"type": "rowContainer",
"elements": {
"element1": {
"type": "text",
"name": "element1",
"label": "rowContainer1",
"placeholder": "Enter text"
},
"element2": {
"type": "text",
"name": "element1",
"label": "rowContainer1",
"placeholder": "Enter text"
},
"element3": {
"type": "text",
"name": "element1",
"label": "rowContainer1",
"placeholder": "Enter text"
}
}
}
```

*Source: `src/schemaRendering/schemaElements/RowContainer.js`*

---

## Select

A dropdown select component based on react-select that provides a customizable selection interface with support for styled options and an optional "add more" button.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `options - Array of option objects, each with value and label properties` (Array) - 
- `value` (Object, optional) - Default/initial selected option (object with value and label)
- `help` (string, optional) - Help text displayed below the input
- `showAddMore=false` (boolean, optional) - Whether to show an add more button

### Example
```json
// Basic dropdown select
{
"type": "select",
"name": "category",
"label": "Select",
"options": [
{ "value": "option1", "label": "Option 1" },
{ "value": "option2", "label": "Option 2" },
{ "value": "option3", "label": "Option 3" }
],
"value": { "value": "option1", "label": "Option 1" },
"help": "Select one option from the dropdown"
}
```

*Source: `src/schemaRendering/schemaElements/Select.js`*

---

## StaticText

Displays static or dynamically fetched text content. Can show plain text or HTML content with options for dynamic content retrieval using script files, auto-refreshing, and manual refresh controls.

### Properties
- `name - Input field name` (string) - 
- `label` (string, optional) - Display label for the field
- `labelOnTop=false` (boolean, optional) - Whether to display label above the content
- `help` (string, optional) - Help text displayed below the content
- `value` (string, optional) - Static text content (used when isDynamic is false)
- `isDynamic=false` (boolean, optional) - Whether content should be fetched from a script retriever
- `retriever` (string, optional) - Path to the script file that will generate dynamic content
- `retrieverParams` (Object, optional) - Parameters passed to the script as environment variables, values with $ prefix will be replaced with form values
- `allowHtml=false` (boolean, optional) - Whether to render content as HTML using dangerouslySetInnerHTML
- `showRefreshButton=false` (boolean, optional) - Whether to show a manual refresh button for dynamic content
- `refreshInterval` (number, optional) - Auto-refresh interval in seconds. Paused while the browser tab is hidden; a poll is skipped if the previous one is still running. A failed poll keeps the previous content with an inline "Refresh failed" note, and only raises the global error after several failures in a row.
- `refreshWhile` (string, optional) - Condition (same syntax as `condition`); auto-refresh only runs while it is true, with one final refresh when it turns false, e.g. "!drona_status.DONE"
- `isHeading=false` (boolean, optional) - Whether to style the text as a heading with larger, bold font
- `layout` (string | Object | Array, optional) - Optional frame: `"card"` (rounded card with a title pill and green dot) or `"boxed"`, e.g. `{ "preset": "card", "title": "Job Efficiency" }`; a CSS object applies to the content area. The title may reference form fields as `$fieldName`, e.g. `"Resource Usage · Job $jobs"`. See [Choice element styling](#choice-element-styling). Unset renders no frame
- `setError` (function, optional) - Function to handle errors during content fetching

### Examples
#### Example 1
```json
// Basic static text
{
"type": "staticText",
"name": "infoText",
"label": "Information",
"value": "This is some static text",
"help": "Simple static text display"
}
```

#### Example 2
```json
// Dynamic text that fetches from a script retriever
{
"type": "staticText",
"name": "dynamicContent",
"label": "Script Output",
"isDynamic": true,
"retriever": "retrievers/text_retriever.sh",
"retrieverParams": { "id": "$userId" },
"showRefreshButton": true
}
```

#### Example 3
```json
// Dynamic HTML content with auto-refresh
{
"type": "staticText",
"name": "liveHtmlContent",
"label": "Server Status",
"isDynamic": true,
"retriever": "retrievers/server_status.sh",
"allowHtml": true,
"refreshInterval": 30
}
```

*Source: `src/schemaRendering/schemaElements/StaticText.js`*

---

## Text

A standard text input field component for collecting single-line text input. Provides form control with label, help text, and placeholder support.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `value` (string, optional) - Default/initial value for the input
- `placeholder` (string, optional) - Placeholder text shown when the field is empty
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// Basic text input
{
"type": "text",
"name": "userName",
"label": "Text",
"value": "defaultValue",
"placeholder": "Enter your text here",
"help": "Standard single-line text input field"
}
```

*Source: `src/schemaRendering/schemaElements/Text.js`*

---

## TextArea

A multi-line text input field component for collecting longer text content. Provides an expandable text area with adjustable number of rows.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `value` (string, optional) - Default/initial value for the input
- `rows=4` (number, optional) - Number of visible text rows
- `placeholder` (string, optional) - Placeholder text shown when the field is empty
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// Basic textarea input
{
"type": "textarea",
"name": "description",
"label": "TextArea",
"value": "This is a default value with multiple lines of text.\nThis is the second line.",
"rows": 6,
"placeholder": "Enter multi-line text here",
"help": "Multi-line text input for longer content"
}
```

*Source: `src/schemaRendering/schemaElements/TextArea.js`*

---

## Time

A time duration input component that allows users to specify time periods using separate days, hours, and minutes fields. The component internally converts these values to a combined "hours:minutes" format.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `value` (string, optional) - Default/initial value in format "HH:MM" where HH includes days converted to hours
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// Time duration input with separate day/hour/minute fields
{
"type": "time",
"name": "jobDuration",
"label": "Time",
"value": "36:30",
"help": "Specify a time duration in days, hours, and minutes"
}
```

*Source: `src/schemaRendering/schemaElements/Time.js`*

---

## Unit

A compound input component that combines a numeric value with a unit selector. Useful for inputs like memory size (GB, MB), time duration (hours, minutes), or any quantity that requires both a number and unit.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `value` (string, optional) - Default/initial value in format "numberunit" (e.g., "16GB")
- `units - Array of unit options, each with value and label properties` (Array) - 
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// Memory size input with unit selection
{
"type": "unit",
"name": "memorySize",
"label": "Unit",
"value": "16GB",
"units": [
{ "value": "MB", "label": "MB" },
{ "value": "GB", "label": "GB" },
{ "value": "TB", "label": "TB" }
],
"help": "Select a numeric value with units"
}
```

*Source: `src/schemaRendering/schemaElements/Unit.js`*

---

## Uploader

A file and directory uploader component that allows users to select and upload individual files or entire directories. Displays a list of uploaded files and supports removal of files.

### Properties
- `name - Input field name, used for form submission` (string) - 
- `label` (string, optional) - Display label for the field
- `value` (Array|string, optional) - Default/initial value, can be array of file objects or JSON string
- `multiple=false` (boolean, optional) - Whether multiple file selection is allowed
- `acceptedFileTypes` (Array, optional) - Array of MIME types or file extensions to accept
- `help` (string, optional) - Help text displayed below the input

### Example
```json
// File and directory uploader
{
"type": "uploader",
"name": "dataFiles",
"label": "Uploader",
"multiple": true,
"acceptedFileTypes": ["text/*", "application/json", ".csv"],
"help": "Upload files or directories with support for multiple file selection"
}
```

*Source: `src/schemaRendering/schemaElements/Uploader.js`*

---


