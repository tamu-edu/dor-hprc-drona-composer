---
sidebar_position: 1
---

# Generate and Submit Workflows

Drona Workflow Engine (or just Drona) provides a 100% graphical interface to create and run scientific workflows without the need to write a Slurm script or even be aware of Slurm syntax. It guides you to provide the relevant information to generate and submit jobs for many different Drona Environments.

:::tip Where to find Drona
How you open Drona depends on your site; ask your support team if you're unsure. On an [Open OnDemand](https://openondemand.org/) portal, Drona shows up by default in the **Jobs** menu as **Drona Workflow Engine**.
:::

## First-Time Initialization

When you launch Drona for the first time, you will be prompted to choose where your Drona data should be stored. This location is saved in a configuration file at:

```
~/.drona/config.json
```

This file tells Drona where to find and store all of your data. Here is an example `config.json`:

```json
{
  "drona_dir": "/path/to/scratch/<username>/drona_wfe"
}
```

The `drona_dir` path is where Drona will store your environments and your workflows, including their output. You can point this to any directory you have access to. On most HPC systems, a scratch directory is a good choice.

:::note

If you ever need to change your storage location, simply update the `drona_dir` path in `~/.drona/config.json` and restart Drona.

If `~/.drona/config.json` is missing or the specified directory does not exist, Drona will prompt you to reconfigure on next launch.
:::

## The Environments Page

Each Drona Environment implements a scientific workflow. When you open Drona, the **environments page** lists every environment available to you, so this is where every workflow starts. Each environment has a short description and a category, and you can search the list to find the workflow you need. Open an environment to start working with it.

![Drona environments page](/img/user-guide/environments.png)

**Note:** the environments shown here are an example from one Drona installation. Each site offers its own selection, so your list may look different.

Drona checks for environments in two locations:

1. **Drona system directory** - Environments installed by your site's administrators, available to all users
2. **`<drona_dir>/environments`** - Your personal environments, marked with a **User** tag

The environments page also lists your recent workflows, so you can go back to one you started earlier. Once an environment is open, the **app bar** at the top lets you go back to the list of environments, switch directly to another environment, or [import a new one](../environments/user-environments.md#option-1-import-from-the-environment-repository).

Working with an environment follows the same two steps every time: you **create** a workflow by filling in a form, then **preview and run** the scripts Drona generates from it. Once it is submitted, you can follow it as described in [Monitor Workflows](../using-drona/monitoring.md).

The screenshots below use the **AlphaFold** environment, a protein structure prediction workflow, as an example. Other environments have their own forms and scripts, but the steps are the same.

## Step 1: Create — The Input Form

In the first step you provide the information the workflow needs. Every environment brings its own form, so the fields you see depend on the workflow. They are often domain specific: a protein structure prediction workflow asks for things like input sequences and model settings, while a general-purpose workflow asks for the commands to run and the software modules to load. Most forms also let you choose the computing resources for the job.

You don't need to know how the workflow translates these choices into batch jobs. The form is written by the environment's author in terms a researcher in that field will recognise.

![Drona input form](/img/user-guide/create-form.png)

:::tip
To get additional information for any of the input fields, hover over the little question mark icon. It will show additional information and help.
:::

:::note
Fields you leave empty fall back to sensible defaults. If the environment needs a value before it can generate the scripts, Drona tells you which fields are missing. Once you are finished, click the **Generate** button.
:::

## Step 2: Preview and Run — The Generated Scripts Window

After clicking Generate, the **Generated Scripts** window appears. It shows everything Drona produced from your input before anything is submitted, so you can check it, adjust it, and then run it.

![Drona Generated Scripts window](/img/user-guide/generated-scripts.png)

:::note
Some environments use their own wording for these buttons and this window, for example **Run action** in Manage mode.
:::

### Generated Scripts

Each file Drona generated opens in its own tab: the job scripts, the driver script that submits them, and any input files the workflow needs. For a workflow made of several jobs, each job gets its own script, and the driver submits them in the right order. The scripts are **fully editable**, with syntax highlighting, so you can make last-minute changes before running. For the Generic environment, this is where you enter the commands you want the job to execute.

You can also **add files to the workflow**: create a new file from scratch, or browse your files on the cluster and include an existing one. Files you added can be removed again from their tab.

### Messages

Above the scripts, Drona shows messages about your input. **Errors** and **warnings** point out mistakes or inconsistencies, for example a GPU requested for longer than your cluster allows. **Notes** carry environment-specific information that helps you check the job before running it. You can dismiss each group of messages once you've read it.

### Output

When you click **Run**, the output streams into a pane next to the scripts, so you can follow the submission as it happens. A status badge shows whether the run is still going, completed, or failed. You can hide the output pane to give the scripts more room and bring it back at any time.

A preview runs once. After that, the Run button shows how the run ended; close the window and click Generate again to start a new run.

### Arranging the Window

The window adapts to how you want to work:

- **Fullscreen** turns the window into a full editor view. Press <kbd>Esc</kbd> to leave it.
- **Split editor** shows several files side by side, and you can drag the dividers to resize them.
- **Minimize** tucks the window away so you can look at the form again, and brings it back with your edits intact.
