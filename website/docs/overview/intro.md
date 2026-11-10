---
sidebar_position: 1
---

# Introduction

**Drona Workflow Engine** (Drona for short) lets researchers run scientific workflows on HPC clusters through a web interface. They fill in a form made for their workflow, and Drona generates the scripts, submits the jobs and helps them follow the results.

Drona is a standalone web application that can be deployed at any site, for example through an [Open OnDemand](../integrations/open-ondemand) portal, which handles login and runs Drona as each user. It is designed to be scheduler-agnostic and supports Slurm. Drona was developed by High Performance Research Computing at Texas A&M University.

## Why Drona

More and more HPC users come from fields where batch scripts, software modules and job pipelines aren't part of the training. The learning curve leads to failed jobs, wasted resources and a heavy load on support teams. Drona lets researchers work in terms of their own field, while still showing everything it runs on their behalf.

For experienced users, Drona is a productivity tool. It takes care of the boilerplate every run needs, checks resource requests against the cluster, and keeps the generated scripts fully editable. A workflow that worked once can be rerun or recreated with new settings in a few clicks.

After submission, Drona's monitoring shows each job's state, output and files, resource utilization graphs, and domain-specific results such as plots or structures, with actions such as cancel and rerun. A searchable history lists all your workflows in one place.

## How It Works

Every scientific workflow in Drona is packaged as a **Drona Environment**. Working with one follows the same path:

1. **Choose an environment.** The start page lists every environment available to you, from those your site installs for everyone to the ones you add yourself.
2. **Fill in the form.** Each environment has its own form, written for its domain. Forms can adapt as you go and fill their options from the live state of the cluster, such as available software versions or GPU types.
3. **Review and run.** Drona generates all the scripts and shows them in an editable preview before anything is submitted, with warnings when a request doesn't fit the cluster. You decide when to run it.
4. **Monitor.** After submission, an environment can show how the workflow is doing and what it produced, from job status and resource usage to domain-specific results.

See [Generate and Submit Workflows](../user-guide/using-drona) and [Monitor Workflows](../using-drona/monitoring) for the details.

## Not Just an Assistant, Also a Framework

A Drona Environment is a small set of declarative files, entirely separate from the Drona Workflow Engine itself, so adding or changing a workflow never means changing Drona. The files describe the form, how its values map into the scripts, and how the job is submitted.

That makes environments easy to create, adapt and share. Administrators install them for all users, environment developers publish them in a repository that others can import from, and researchers can build and test their own in a personal workspace. See the [Environment Development Overview](../environments/overview) for what an environment contains.

## Batteries Included: The Drona Runtime Library

Most workflows need the same things: a job name and location, memory and run time, the right Slurm settings for the cluster, a list of the run's jobs, logs, rerun and cancel. Drona ships all of these as the **Drona Runtime Library**, a collection of ready-made form parts, map fragments, retrievers and helper functions.

An environment pulls a part in with a single line instead of building it, and gets the part's checks and later fixes with it. That's why a complete environment, with a form, cluster-aware resource settings and a monitoring page, can be a few short files: the environment author writes only what is specific to their science. Sites tailor the library to their clusters, for example with the limits Drona checks resource requests against.

See the [Drona Runtime Library](../runtime-library/index.md) for what it contains, and the [tutorial](../tutorial) for an environment built on it.

## Who Is Drona For?

- **Researchers** who want to run scientific workflows on HPC without learning the scheduler
- **Experienced HPC users** who want to skip the boilerplate and keep track of their runs
- **HPC sites** that want to offer guided, validated workflows to their users
- **Environment developers** who want to build workflows others can reuse
- **Science gateway builders** who want to give a research community a web portal for its applications, without writing a web app from scratch

## Where to Go Next

- **I want to run workflows:** [Generate and Submit Workflows](../user-guide/using-drona)
- **I want to build an environment:** [Build Your First Environment](../tutorial)
- **I run a cluster:** [Setup](../setup)

Some terms, such as *Drona Environment* and *workflow instance*, have a specific meaning in these docs. See [Key Concepts](./key-concepts).
