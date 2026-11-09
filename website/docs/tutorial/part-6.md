---
title: "Part 6: Share It"
---

# Part 6: Share It

Your environment works. The last step is to describe it, so that it looks right on the start page and others can import it.

## Add a Manifest

The start page shows the name, category and description from `manifest.yml`. `requires_drona` states which version of the [environment API](../environments/publishing#declaring-the-drona-version) your environment needs.

```yaml title="part-6/manifest.yml"
name: "WordCount"
description: "Counts the most common words in a text file. Example from the Drona tutorial."
category: "Examples"
version: "1.0.0"
author: "Your Name"
requires_drona: ">=2.0"
```

You can also add a square `icon.png`, which appears on the environment's card.

## Publish to an Environment Repository

To let others add it with **Import environment**:

1. Copy the `WordCount` directory to the root of your site's environment repository, on the branch Drona reads (`env_repo_ref`).
2. Add an entry to the repository's `metadata.json`, repeating `requires_drona`:

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

See [Publishing Environments](../environments/publishing) for how Drona uses this.

## What You've Learned

You built a Drona Environment that:

- Collects input with a form that adapts to the user's choices
- Validates the input and explains problems before submission
- Reuses shared form parts and Slurm settings
- Shows live results, logs and actions after submission
- Can be shared with other users

## Where to Go Next

- Add a live plot: [Live Charts](../environments/live-charts)
- Run several stages: [Driver Scripts](../environments/driver)
- See what you can reuse: [Shared Environment Library](../environments/shared-library)
- Browse every element: [Form Components](../frontend/form-components)
