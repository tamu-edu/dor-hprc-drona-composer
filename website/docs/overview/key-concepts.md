---
sidebar_position: 2
---

# Key Concepts

| Term | Meaning |
|---|---|
| **Scientific workflow** | The orchestration of a sequence of tasks required to carry out a research process from start to finish. |
| **Drona Environment** | A collection of schema, mapping, and driver files that define and implement a scientific workflow within the Drona Workflow Engine. |
| **Workflow instance** | One submission of a Drona Environment, with its own directory and database record. The app calls this a *workflow*, as in *Recent Workflows*. |
| **Job** | One scheduler job. A workflow instance can have several, for example a CPU stage followed by a GPU stage. |

## Terms Used in the App

| Term | Meaning |
|---|---|
| **Create and Manage** | Many environments have two modes: *Create* starts a new workflow instance, and *Manage* shows and acts on an existing one. |
| **Generate and Run** | **Generate** builds the scripts and shows them for review and editing. **Run** submits them. |
| **System and user environments** | System environments are installed for everyone by an administrator. User environments are in your own Drona directory. |
| **Retriever** | A script that supplies live data to the form, such as a list of options or a job's status. |
| **Drona Runtime Library** | The collection of ready-made form parts, map fragments, retrievers and helper functions that ships with Drona (in `runtime_support/`) and that any environment can reuse. |
