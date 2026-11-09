---
sidebar_position: 2
---

# Primers

A demonstration video and quick references to help you get up to speed with Drona Workflow Engine.

## Demo Video

A demonstration of Drona in action, from choosing an environment to job submission. This video shows an older version of Drona, so the interface looks different today.

<iframe width="100%" height="500" src="https://www.youtube.com/embed/tgpP9LPGlYQ?si=IybXuFSU2gMkDuRj"  title="Drona Workflow Engine Demo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

---

## Quick Reference

### Navigating the Interface

| Area | Description |
|------|-------------|
| **Start page** | Lists all available environments and your recent workflows |
| **App bar** | Return to all environments, switch environment, import an environment, or open the help |
| **Input form** | Fill in the fields of the selected environment |
| **Generated Scripts window** | Opened with **Generate**; review and edit the generated job script, then click **Run** |
| **Message pane** | View validation warnings such as resource allocation constraints and environment-specific guidance |

### Environment Types

| Environment | Use Case |
|-------------|----------|
| **Generic** | Flexible environment for creating any job script |
| **Research-specific** | Pre-configured environments for specific scientific workflows such as LAMMPS and AlphaFold |
| **User** | Environments you created or imported, in `<drona_dir>/environments` |

### Key Concepts

- **Drona Environments** implement a scientific workflow and determine which form fields are available
- **Form fields** are dynamically generated based on the selected environment
- **Generated Scripts window** shows the generated Slurm scripts, which are fully editable before you click **Run**
- **Message pane** provides validation feedback and environment-specific guidance
- **Importing** adds environments from your site's environment repository to your personal directory

For the full list of terms, see [Key Concepts](../overview/key-concepts).

## Additional Resources

- [Using Drona Workflow Engine](./using-drona) - Detailed usage guide
