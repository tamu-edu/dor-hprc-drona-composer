---
title: Build Your First Environment
---

# Build Your First Environment

In this tutorial you build **WordCount**, a Drona Environment that reports the most common words in a text file. The science is deliberately simple so that you can focus on how an environment works.

Each part adds to the previous one and ends with something you can try:

| Part | You add | You learn |
|---|---|---|
| [1. Hello Drona](./part-1.md) | A form, a map, a driver and a job script | How the files fit together |
| [2. A better form](./part-2.md) | A checkbox and a conditional field | Form elements and conditions |
| [3. Logic and validation](./part-3.md) | `utils.py` | Python functions, warnings and errors |
| [4. Reuse shared parts](./part-4.md) | Shared form parts and Slurm settings | Runtime support, `$ref` and `$include` |
| [5. Manage mode](./part-5.md) | A live results card, logs and actions | Create and Manage, and retrievers |
| [6. Share it](./part-6.md) | A manifest | Versions and publishing |

## Before You Start

You need access to Drona on a Slurm cluster. Find your Drona directory: it is the `drona_dir` value in `~/.drona/config.json`. You will work in:

```
<drona_dir>/environments/WordCount/
```

You also need a text file to analyze. Any plain text file will do.

## Getting the Files

The complete files for each part are in the Drona repository under [`website/examples/word-count`](https://github.com/tamu-edu/dor-hprc-drona-composer/tree/master/website/examples/word-count). You can type them in as you go, or copy a part into place:

```bash
cp -r website/examples/word-count/part-1 <drona_dir>/environments/WordCount
```

The code on these pages is checked against those files by an automated test, and every part is generated and run by that test.
