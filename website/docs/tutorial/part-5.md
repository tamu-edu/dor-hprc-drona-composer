---
title: "Part 5: Share It"
---

import Snippet from '@site/src/components/Snippet';

# Part 5: Share It

WordCount works. The last step is to describe it, so it looks right on the environments page, and to share it so others can import it.

## The Manifest: `manifest.yml`

<Snippet file="manifest.yml" />

- **`name`**, **`description`** and **`category`** are what the environments page shows on WordCount's card, and what its search box matches.
- **`version`** is your environment's own version. Raise it when you change the environment, so users can tell which one they have.
- **`author`** says who wrote and maintains the environment.
- **`requires_drona`** is the version of Drona's [environment API](../environments/publishing#declaring-the-drona-version) the environment needs. An environment that needs a newer Drona than a site runs can't be imported there.

You can also add a square `icon.png` to the environment's directory. It appears on the environment's card.

## Publish to an Environment Repository

To let others add WordCount with **Import environment**:

1. Copy the `WordCount` directory to the root of your site's environment repository, on the branch Drona reads (`env_repo_ref`).
2. Add an entry to the repository's `metadata.json`, repeating the manifest's values:

```json
"WordCount": {
  "name": "WordCount",
  "description": "Counts the most common words in a text file.",
  "category": "Examples",
  "cluster": "",
  "organization": "Your Site",
  "version": "1.0.0",
  "author": "Your Name",
  "last_updated": "2026-11-09",
  "requires_drona": ">=2.0"
}
```

See [Publishing Environments](../environments/publishing) for how Drona uses this. To share your environment beyond your site, you can [contribute it to Drona's environment repository](../environments/publishing#contributing-to-the-drona-environment-repository).

## What You've Learned

You've seen every part of a Drona Environment that:

- Asks domain questions in a form that adapts to the user's choices
- Reuses shared form parts and Slurm settings instead of writing them
- Checks the input and explains problems before the job runs
- Generates and submits a job script the user can review and edit
- Shows the run's jobs and results after submission, with actions such as rerun
- Can be shared with other users

And most of it you didn't have to write. WordCount's own code is a handful of form fields, three small checks, one job script and one results card; the Drona Runtime Library provided the rest. Before building something for your own environment, look in the [library](../runtime-library/index.md) first.

## Where to Go Next

- Start your own environment by copying WordCount and changing the form, the map and the job script.
- Add a live plot: [Live Charts](../environments/live-charts)
- Run several stages: [Driver Scripts](../environments/driver)
- See every form element: [Form Components](../frontend/form-components)
