---
sidebar_position: 4
---

# Shared Environment Library

Every environment lives in its own directory, but most environments need the same handful of things: a module picker, a job-monitoring table, a way to check "has this been configured yet?" before showing the rest of the form. Rather than copy those into every environment, Drona ships a shared library that any environment can pull from via the `$DRONA_RUNTIME_DIR` placeholder.

```
runtime_support/
├── form_components/    JSON schema fragments, pulled in with $ref
├── retriever_scripts/  scripts that supply dynamic form data or live widget HTML
└── html_templates/     HTML fragments that retriever scripts fill in and return
```

This page explains how the three pieces fit together, the conventions worth following when you add to them, and a few mistakes that are easy to make and hard to spot.

## Shared form components

A `form_components/*.json` file is a flat JSON object where each top-level key is one reusable schema fragment. An environment's own `schema.json` pulls in exactly the fragments it needs with `$ref`, using the `$DRONA_RUNTIME_DIR` placeholder described in [Schema Decomposition](./schema#referencing-a-sharedcurated-component-directory):

```json
{
  "Modules": {
    "$ref": "$DRONA_RUNTIME_DIR/form_components/drona_module_picker.json#/Modules"
  }
}
```

Two conventions worth following:

- **Group fields that depend on each other in the same file**, rather than spreading them across separate `$ref`s that have to stay in sync by hand. For example, `drona_create_manage.json` defines a hidden "configured" check *and* the mode selector it gates, together — so a change to one can't silently drift out of sync with the other.
- **Don't copy a fragment into an environment's own schema "just this once."** If it needs a small variation, that's usually a sign it should take a parameter or condition rather than be forked — a forked copy stops receiving fixes made to the shared original.

## Shared retriever scripts

Any schema element with `isDynamic: true` (`hidden`, `staticText`, `dynamicSelect`, and friends — see [Retriever Scripts](./retriever-scripts)) calls a script by name. The backend resolves that name in two steps:

1. relative to the **environment's own directory** (an env-local override)
2. `runtime_support/retriever_scripts/<name>` (the shared fallback)

This lookup order is what lets one environment override a shared script — drop a same-named file directly in the environment's directory and it takes priority automatically, no schema change required. The flip side: **if you fix a bug in a shared script and it doesn't seem to take effect for one particular environment, check whether that environment has its own copy of the same name shadowing it.**

## Shared HTML templates

Widgets that render live HTML (a `staticText` field with `allowHtml: true`) typically pair a retriever script with a matching file in `html_templates/`. The script reads the template, replaces its `{{PLACEHOLDER}}` tokens, and prints the result — that's what ends up on the page.

A few things make these fragments play well together, since several can be mounted on the same page at once:

- **Scope every CSS rule under the widget's own container `#id`.** Define colors/spacing as CSS custom properties on that container rather than as bare global values, so nothing leaks into (or gets clobbered by) another widget's fragment.
- **The floating "pill" title is the shared header pattern** — a small badge that overlaps its card's top edge. If a card also needs `overflow: hidden` (for example, to clip edge-to-edge content to its rounded corners), put that on an *inner* wrapper instead of the card itself, or the title gets clipped along with everything else.
- **`staticText`'s manual refresh button is a real DOM sibling of your HTML**, absolutely positioned in the top-right corner of the same wrapper. It always paints above the retrieved content, but avoid putting your own content in that exact corner regardless — it'll look cramped next to the button.

## Gotchas

These cost real debugging time when they were first hit, and none of them are obvious from reading a single file in isolation:

- **`${VAR:=default}` assigns a default; `${VAR=default}` does not.** The version without the colon is a bare parameter expansion — bash treats the result as a command to *execute*, not a value to assign. A script using this to default an `HTML_TEMPLATE` path with the bare form will run with an empty variable and no error, and the widget just renders blank.
- **HTML-escape anything that isn't hardcoded** before it reaches a template placeholder. Retrieved HTML is rendered with React's `dangerouslySetInnerHTML`, so a job name or line of job output containing `<`, `>`, or `&` gets parsed as markup instead of displayed as text — it just silently disappears rather than erroring.
- **Don't interpolate a variable into a `sed` substitution command.** `sed -e "s/{{X}}/$VAR/"` breaks the moment `$VAR` contains sed's own delimiter — which happens more often than it sounds, since fallback/error values like the literal string `"N/A"` contain a `/`. Prefer plain bash substitution (`CONTENT="${CONTENT//\{\{X\}\}/$VAR}"`), which treats the replacement as a literal string no matter what it contains.
- **An unmapped `$param` is passed as `None`, not the literal string `"$paramname"`.** If a `utils.py` function needs to know whether a field simply wasn't part of the submitted form (as opposed to being submitted empty), check `is None` — checking for the literal `"$paramname"` string was the old behavior and will never match.

## Recipes

**Add a new monitoring widget:**
1. Write the retriever script in `runtime_support/retriever_scripts/`.
2. Add a matching `runtime_support/html_templates/*.html` fragment with the `{{PLACEHOLDER}}` tokens the script fills in.
3. Add a `runtime_support/form_components/*.json` entry: `"type": "staticText", "isDynamic": true, "allowHtml": true, "retriever": "your_script.sh"`.
4. `$ref` that entry from any environment's schema.

**Add a shared field**: add it to a `form_components/*.json` file (existing or new), then `$ref` it — don't copy the field definition into an environment's own schema.

**Override a shared retriever for one environment**: place a same-named script directly in that environment's own directory.

---

**Texas A&M University High Performance Research Computing**
