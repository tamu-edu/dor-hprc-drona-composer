# legacy

Files no drona-v2 environment uses, kept so environments written for older Drona versions keep working.
They are still found through the old paths (`form_components/`, `retriever_scripts/`, `html_templates/`)
via `aliases.json`, and retrievers by name (last in the search order).

Removed at environment API 2.1, together with `aliases.json` and the `driver_scripts/` symlink. Don't use
them in new environments; see `../CATALOG.md` ("Legacy") for what replaced them.
