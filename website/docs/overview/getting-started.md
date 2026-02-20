---
sidebar_position: 3
---

# Getting Started

This guide will help you get up and running with Drona Workflow Engine quickly.

## Prerequisites

Before you begin, ensure you have the following:

- **Access to TAMU HPRC systems** (Grace, Terra, or other supported clusters)
- **Basic understanding of HPC concepts** (jobs, schedulers, modules)
- **Web browser** (Chrome, Firefox, Safari, or Edge)

## Quick Start

### Step 1: Access Drona Workflow Engine

Navigate to the Drona Workflow Engine interface through your HPRC portal:

```
https://portal.hprc.tamu.edu/drona-composer
```

### Step 2: Select an Environment

1. Choose from available pre-configured environments
2. Each environment is tailored for specific types of computational work
3. Start with the "Demo Environment" to explore features

### Step 3: Create Your First Job

1. **Fill out the form** - Complete the dynamically generated form fields
2. **Upload files** - Add any input files your job requires
3. **Configure resources** - Set CPU, memory, and time requirements
4. **Preview** - Review your job configuration before submission

### Step 4: Submit and Monitor

1. **Submit** your job to the HPC scheduler
2. **Monitor** real-time status updates
3. **Download** results when complete

## Basic Workflow

### Creating a Simple Job

Here's a step-by-step example for creating a basic computational job:

#### 1. Environment Selection
```json
{
  "name": "python-analysis",
  "description": "Python data analysis environment",
  "modules": ["python/3.9.0", "numpy/1.21.0"]
}
```

#### 2. Form Configuration
- **Job Name**: `my-analysis-job`
- **Time Limit**: `01:00:00` (1 hour)
- **Memory**: `4GB`
- **CPU Cores**: `1`

#### 3. File Upload
- Upload your Python script
- Add any data files required
- Specify output directory

#### 4. Job Submission
Review the generated job script and submit to the scheduler.

## Understanding the Interface

### Main Components

#### Job Composer Panel
- **Form Fields**: Dynamically generated based on selected environment
- **File Manager**: Upload, browse, and manage files
- **Preview**: Real-time preview of generated job scripts
- **History**: Access to previous job submissions

#### Status Panel
- **Current Jobs**: Monitor active job status
- **Queue Information**: View cluster queue status
- **Resource Usage**: Track resource consumption
- **Notifications**: Real-time alerts and updates

### Navigation

#### Top Navigation
- **Home**: Return to main job composer
- **Environments**: Browse available environments
- **Help**: Access documentation and support
- **Profile**: User settings and preferences

#### Side Panels
- **Recent Jobs**: Quick access to recent submissions
- **Favorites**: Saved environment configurations
- **Templates**: Pre-configured job templates

## Common Use Cases

### Data Analysis Workflows

Perfect for:
- Python/R data analysis
- Statistical computations
- Data visualization
- Machine learning training

```python
# Example: Simple data analysis job
import pandas as pd
import numpy as np

# Load and process data
df = pd.read_csv('input_data.csv')
results = df.groupby('category').agg({
    'value': ['mean', 'std', 'count']
})

# Save results
results.to_csv('analysis_results.csv')
```

### Simulation Workflows

Ideal for:
- Scientific simulations
- Engineering modeling
- Computational fluid dynamics
- Molecular dynamics

### Batch Processing

Great for:
- Image/video processing
- File format conversions
- Large dataset processing
- Parameter sweeps

## Tips for Success

### Resource Planning
1. **Start small** - Begin with modest resource requests
2. **Monitor usage** - Check actual vs. requested resources
3. **Scale up** gradually based on performance observations

### File Management
1. **Organize files** in clear directory structures
2. **Use descriptive names** for jobs and files
3. **Clean up** completed job files regularly

### Job Optimization
1. **Test locally** when possible before HPC submission
2. **Use appropriate modules** for your software stack
3. **Consider parallel processing** for suitable workloads

## Troubleshooting

### Common Issues

#### Job Won't Submit
- Check required fields are filled
- Verify file uploads are complete
- Ensure resource requests are reasonable

#### Job Fails Immediately
- Review job script for syntax errors
- Check module availability
- Verify file paths and permissions

#### Slow Performance
- Monitor resource usage
- Consider parallel processing options
- Optimize I/O operations

### Getting Help

1. **Documentation**: Comprehensive guides for all features
2. **Examples**: Sample configurations and scripts
3. **Support**: Contact HPRC support team
4. **Community**: User forums and knowledge sharing

## Next Steps

Once you're comfortable with basic job submission:

1. **Explore Advanced Features**
   - Custom environment creation
   - Workflow automation
   - Integration with external tools

2. **Learn Schema Configuration**
   - Create custom form fields
   - Build reusable templates
   - Develop retriever scripts

3. **Optimize Your Workflows**
   - Performance tuning
   - Resource optimization
   - Monitoring and analytics

---

Ready to dive deeper? Check out our detailed component documentation or explore specific use cases in the examples section.