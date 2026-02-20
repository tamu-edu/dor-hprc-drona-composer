---
sidebar_position: 2
---

# Primers

A collection of video tutorials, primers, and resources to help you get up to speed with Drona Workflow Engine.

## Video Tutorials

### Getting Started with Drona

An introductory walkthrough of Drona Workflow Engine covering the basics of accessing Drona, selecting environments, filling out forms, and submitting jobs.

<!-- TODO: Replace with actual YouTube video embed -->
<iframe width="100%" height="500" src="https://www.youtube.com/embed/VIDEO_ID_HERE" title="Getting Started with Drona" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

---

### Drona Workflow Engine Demo

A demonstration of Drona Workflow Engine in action, showing the complete workflow from environment selection to job submission.

<!-- TODO: Replace with actual YouTube video embed -->
<iframe width="100%" height="500" src="https://www.youtube.com/embed/tgpP9LPGlYQ?si=IybXuFSU2gMkDuRj"  title="Drona Workflow Engine Demo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

---

## Quick Reference Primers

### Navigating the Interface

| Area | Description |
|------|-------------|
| **Jobs Tab** | Access Drona from the HPRC Portal Jobs menu |
| **Environments Dropdown** | Select from system and user environments |
| **Input Form** | Fill in workflow-specific fields |
| **Preview Window** | Review and edit generated job script before submission |
| **Message Pane** | View form validation warnings such as resource allocation constraints and environment-specific guidance |

### Environment Types

| Environment | Use Case |
|-------------|----------|
| **Generic** | Flexible environment for creating any job script |
| **Research-Specific** | Pre-configured environments for specific research workflows such as LAMMPS and AlphaFold |
| **Custom** | User-created environments in `$SCRATCH/drona_composer/environments` |

Explore and add existing Drona environments using the + icon next to the environments dropdown.

### Key Concepts

- **Environments** define the workflow type and determine which form fields are available
- **Form Fields** are dynamically generated based on the selected environment
- **Preview Window** shows the generated Slurm scripts, which are fully editable before submission
- **Message Pane** provides validation feedback and environment-specific guidance
- **Importing** environments allows you to add new environments from the HPRC repository to your personal directory

## Additional Resources

- [Using Drona Workflow Engine](./using-drona) - Detailed usage guide
- [HPRC Knowledge Base](https://hprc.tamu.edu/wiki/Main_Page) - General HPRC documentation and user guides
- [HPRC Portal](https://portal.hprc.tamu.edu/) - Access the HPRC Portal

---

**Texas A&M University High Performance Research Computing**
