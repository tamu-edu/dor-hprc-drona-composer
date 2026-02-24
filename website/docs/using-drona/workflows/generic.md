---
sidebar_position: 0
---

# Generic Workflow

The Generic Workflow is a flexible, customizable environment that allows you to submit arbitrary computational jobs to HPC clusters. Unlike specialized workflows tailored to specific applications or frameworks, the Generic Workflow provides a streamlined interface for running any job that can be executed via a Bash script on a SLURM-managed cluster.

## Overview

The Generic Workflow is ideal for:

- **Custom computational tasks** — Running unique codes or scripts not covered by specialized workflows
- **Simple batch jobs** — Executing shell commands, Python scripts, or other executables
- **Prototyping and testing** — Quick iteration on new computational approaches before creating specialized workflows
- **One-off analyses** — Running standalone analyses without needing a dedicated workflow

## Key Features

The Generic Workflow provides a straightforward interface to:

- Upload input files and data to your job workspace
- Select and load software modules from the HPC environment
- Configure resource allocation (CPU cores, memory, compute time)
- Request GPU accelerators if available on your cluster
- Specify advanced task placement options for parallel jobs
- Define your custom job commands in a Bash script

## Form Fields and Options

When creating a job with the Generic Workflow, you'll encounter the following sections:

### File Upload

- **Upload files** — Add local files or directories needed by your job. This is useful for input data, configuration files, or custom scripts. You can upload multiple files and directories at once.

### Module Selection

- **Add modules** — Load software modules required by your job. The module search is dynamic — start typing to find available software packages. 
- **Toolchain selection** — Choose a specific toolchain if needed:
  - No toolchain (default)
  - foss/2023b
  - foss/2024a
  - intel/2023b
  - intel/2024a

### Task Configuration

Basic task settings for controlling parallelism:

- **Number of tasks** — Specify how many tasks your job uses. For serial jobs, leave this as 1. For MPI-based parallel codes, set this to the number of MPI processes.

### Advanced Task Options

When you check the "Advanced task options" box, additional fields become available:

- **Number of nodes** — Only use this if running multiple tasks across multiple nodes. This is common for distributed memory parallel codes (e.g., MPI). Leave as 0 if you're unsure.
- **Number of CPUs per task** — Set this for hybrid parallel codes that use both MPI and OpenMP. The total CPU cores allocated will be: `#tasks × #cpus_per_task`. For OpenMP-only jobs, set tasks to 1 and cpus_per_task to your desired thread count.

### GPU Configuration

- **Use Accelerator** — Select the GPU type if your job utilizes accelerators. You must configure the appropriate environment in your job script to use the selected GPU.
- **Number of GPUs** — Specify how many GPU accelerators you need (only relevant if you selected a specific accelerator type).

### Resource Allocation

- **Total Memory** — Optionally specify the total memory your job needs in GB. Be conservative and request more rather than less. If your job exceeds the requested memory, it will be killed immediately. If not specified, the composer uses a default value.
- **Expected run time** — Optionally specify your estimated job duration. The composer defaults to 2 hours if not provided. Jobs exceeding the requested wall time are killed immediately with loss of intermediate results.
- **Project Account** — Optionally select a different project account than your default. This is useful if you have multiple accounts and want to charge the job to a specific one.
- **Additional SLURM parameters** — Advanced field for specifying additional SLURM flags (e.g., `--exclusive`, `--reservation=NAME`). Only use this if you're familiar with SLURM options.

## Workflow Architecture

The Generic Workflow consists of the following core components:

### 1. Schema Definition (schema.json)

Defines the user interface presented in the Drona Composer, including:
- Form field types and configurations
- Help text and labels for each field
- Conditional visibility of advanced options
- Dynamic content retrieval for modules and accounts

### 2. Job Template (template.txt)

A SLURM submission script template with placeholders for:

```bash
#!/bin/bash
#SBATCH --job-name=[JOBNAME]
#SBATCH --time=[TIME] --mem=[MEM]
#SBATCH --ntasks=[TASKS] --nodes=[NODES] --cpus-per-task=[CPUS]
#SBATCH --output=out.%j --error=error.%j
[PARTITION]
[EXTRA]

module purge
module load WebProxy [MODULES]
cd [flocation]
# ADD YOUR COMMANDS BELOW
```

Where:
- `[JOBNAME]` — User-assigned job name
- `[TIME]` — Wall time limit
- `[MEM]` — Total memory allocation
- `[TASKS]`, `[NODES]`, `[CPUS]` — Task parallelism configuration
- `[PARTITION]` — SLURM partition (automatically set by cluster)
- `[EXTRA]` — Additional SLURM parameters from the form
- `[MODULES]` — User-selected software modules
- `[flocation]` — Working directory for the job

You add your custom job commands at the bottom of this template where the comment indicates.

### 3. Execution Driver (driver.sh)

Handles job submission:

```bash
#!/bin/bash
source /etc/profile

cd [flocation]
 
/sw/local/bin/sbatch [job-file-name]
```

The driver submits your configured job script to the SLURM scheduler.

## Using the Generic Workflow

### Basic Steps

1. **Upload files** (optional) — If your job needs input files or data, upload them in the "Upload files" section.

2. **Select modules** (if needed) — Search for and add any software modules your code requires. Choose an appropriate toolchain if necessary.

3. **Configure resources**:
   - Set the number of tasks for parallel jobs
   - If running across multiple nodes or using hybrid parallelism, enable "Advanced task options" and configure nodes and CPUs per task
   - Request GPUs if your job uses accelerators

4. **Set resource limits**:
   - Specify total memory (conservative estimate)
   - Provide expected run time (conservative estimate)
   - Choose an alternate project account if needed

5. **Advanced SLURM options** (optional) — Add extra SLURM flags if you need cluster-specific features like exclusive node access or reservations.

6. **Write your job script** — In the job composer's main editor, write your Bash script with the commands to run. The script will have access to all uploaded files, loaded modules, and specified resources.

7. **Submit** — Submit your job to run on the cluster.

### Example Use Cases

**Simple Serial Job:**
- Tasks: 1
- CPUs per task: 1 (default)
- Memory: 4 GB
- Run time: 30 minutes
- Job script: Your Python script, compiled executable, or Bash commands

**Parallel OpenMP Job:**
- Tasks: 1
- Advanced options: CPUs per task = 8
- Memory: 16 GB
- Job script: Your OpenMP-enabled code compiled with threading support

**MPI Parallel Job:**
- Tasks: 16
- Advanced options: Nodes = 2 (distributes 16 tasks across 2 nodes)
- CPUs per task: 1 (default)
- Memory: 32 GB
- Job script: `mpirun` with your MPI-enabled executable

**GPU-Accelerated Job:**
- Tasks: 1
- CPUs per task: 4
- GPU accelerator: Select appropriate type (e.g., NVIDIA A100)
- Number of GPUs: 1 or more
- Memory: 32 GB
- Job script: Your GPU code with environment setup for the selected accelerator
