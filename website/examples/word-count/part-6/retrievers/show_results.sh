#!/bin/bash
# JOB_DIR comes from retrieverParams in manage.schema.json
RESULTS="$JOB_DIR/results.txt"

if [ ! -f "$RESULTS" ]; then
  echo "<p>No results yet. The job may still be waiting or running.</p>"
  exit 0
fi

# Escape the text, because the card shows this output as HTML
echo "<pre>"
sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' "$RESULTS"
echo "</pre>"
