#!/bin/bash

# WORKDIR_STYLE=inline gives just the path link (for a "bar" frame that carries the label)
if [ "$WORKDIR_STYLE" = "inline" ]; then
    : "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/workdir-inline-template.html}"
else
    : "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/workdir-template.html}"
fi

# JOB_DIR is a filesystem path pulled from job history; escape before
# embedding since the result is rendered with dangerouslySetInnerHTML.
escape_html() {
    local s=$1
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    s="${s//\"/&quot;}"
    printf '%s' "$s"
}

SAFE_DIR=$(escape_html "$JOB_DIR")

CONTENT=$(cat "$HTML_TEMPLATE")
echo "${CONTENT//\{\{JOB_DIR\}\}/$SAFE_DIR}"
