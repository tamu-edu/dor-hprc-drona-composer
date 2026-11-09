---
sidebar_position: 1
---

# Using Drona Workflow Engine

Drona Workflow Engine (or just Drona) provides a 100% graphical interface to create and run scientific workflows without the need to write a Slurm script or even be aware of Slurm syntax. It guides you to provide the relevant information to generate and submit jobs for many different Drona Environments.

## Accessing Drona Workflow Engine

Drona runs as an app in your site's [Open OnDemand](https://openondemand.org/) portal. Log in to the portal, go to the **Jobs** menu and select **Drona Workflow Engine**. If you can't find it there, ask your site's support team.

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

The `drona_dir` path is where Drona will store your environments, workflows, and job outputs. You can point this to any directory you have access to. On most HPC systems, a scratch directory is a good choice.

:::note

If you ever need to change your storage location, simply update the `drona_dir` path in `~/.drona/config.json` and restart Drona.

If `~/.drona/config.json` is missing or the specified directory does not exist, Drona will prompt you to reconfigure on next launch.
:::

## Choosing a Drona Environment

Each Drona Environment implements a scientific workflow. The **start page** shows every environment available to you as a card with its category and description. Use the search box to filter by name, category or description, and click a card to open it.

Drona checks for environments in two locations:

1. **Drona system directory** - Environments installed by your site's administrators, available to all users
2. **`<drona_dir>/environments`** - Your personal environments, marked with a **User** tag

Below the cards, **Recent Workflows** lists your latest workflows with their state. Clicking one opens it in its environment's Manage view.

Once an environment is open, the **app bar** at the top lets you go back to **All environments**, switch directly to another environment, or import a new one.

## Drona Input Form

Once you select an environment, its form appears. The following screenshot shows the **Generic** environment, which is the most flexible and allows you to create any job script.

![Drona Input Form](/img/user-guide/input-form.png)

Some of the form's fields include:

- **Module element** - Easily add all the modules needed in your job script
- **File upload field** - Upload data and scripts
- **Accelerator field** - Specify what kind of accelerator (if any) you want to use
- **Resource fields** - Specify common job requirements and advanced batch scheduler-specific options

For other environments, these fields will be very different and specific to that particular environment.

:::tip
To get additional information for any of the input fields, hover over the little question mark icon. It will show additional information and help.
:::

:::note
You are not required to enter values for all (or any) of the fields. When no value is specified, Drona Workflow Engine will use default values. Once you are finished entering values, click the **Generate** button.
:::

## Generated Scripts Window

After clicking Generate, the **Generated Scripts** window appears, showing the generated job scripts and any validation messages. Click **Run** in that window to run them; the output streams into the same window.

:::note
Some environments use their own wording for these buttons and this window, for example **Run action** in Manage mode.
:::

![Drona Preview Window](/img/user-guide/preview-window.png)

The window contains the following components:

### Message Pane

Drona analyzes the provided input values to make sure there are no mistakes or inconsistencies. The message pane can also show environment-specific messages to assist you.

For example, a warning might indicate that a GPU was requested for 4 days, but the maximum wall time to request a GPU on your cluster is two days.

### Generated Script Tabs

Drona generates job scripts based on your input. It will insert code for requested modules and changes to the correct directory. For most environments, it will also set up and execute that environment.

All the job script windows are **fully editable**. For the Generic environment, this is the place where you enter the commands you want to execute in the job.

## Importing Drona Environments

Your site may offer more environments in an environment repository. To browse them, click **Import environment** in the app bar, or the **Import an environment** card on the start page. If neither appears, your site has turned import off.

![Import Environments Window](/img/user-guide/import-environments.png)

To import an environment, click its **Add** button and Drona will copy it to `<drona_dir>/environments`. To remove it later, click **Remove** on its card.

## Demo of Drona Workflow Engine

To see Drona Workflow Engine in action, check out the YouTube video below. Note that this is an older version of Drona and the interface looks different today.

<iframe width="100%" height="500" src="https://www.youtube.com/embed/tgpP9LPGlYQ" title="Drona Workflow Engine Demo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
