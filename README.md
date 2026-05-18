# Drona Workflow Engine

## Overview

[Drona Workflow Engine](https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_composer/index.html), developed by High Performance Research Computing (HPRC) at Texas A&M University, assists researchers in creating and submitting any type of job (including complex multi-stage jobs) using a 100% graphical interface. It guides the researcher in providing job-specific information, generating all necessary job files, and submitting the job on the user's behalf.

- **App type:** Passenger Phusion app (React/Flask), categorized under "Jobs"
- **License:** MIT

## Screenshots

![The Drona Dashboard](https://github.com/tamu-edu/dor-hprc-drona-composer/.github/drona.png)

## Features

- 100% graphical interface for creating and submitting batch jobs
- Support for complex multi-stage job workflows
- Researcher-guided form for providing job-specific information
- Automatic generation of all necessary job files
- Editable preview of generated scripts before submission
- Environment system for defining and sharing job templates
- Import feature for researchers to add new environments to their local storage
- Built with React frontend and Flask backend

## Requirements

### Open OnDemand

Open OnDemand >=3.0

### Python

Python 3.8+ (see `requirements.txt` for dependencies)

For detailed information on how to use Drona Workflow Engine and how to create your custom jobs and/or workflows, check out this GitHub repo's Wiki or the HPRC [Drona Workflow Engine](https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_composer/index.html) User Guide.

To set up/install Drona Workflow Engine, see the instructions below. If you have any questions, please contact us at help@hprc.tamu.edu. If you find any bugs, you are welcome to create an issue in this repo.

## Setup

For setup instructions, see the [Installation](https://tamu-edu.github.io/dor-hprc-drona-composer/docs/overview/installation) section on the Drona Workflow Engine site.

## Troubleshooting


## Testing

| Site               | OOD Version   | Scheduler     | Status     |
|--------------------|---------------|---------------|------------|
| TAMU HPRC          | 4.1.4         | Slurm 25.05.6 | Production |

## Known Limitations



## Contributing

For bugs or feature requests, [open an issue](https://github.com/tamu-edu/dor-hprc-drona-composer/issues).

## References

- [Drona Workflow Engine User Guide](https://tamu-edu.github.io/dor-hprc-drona-composer) -- Official documentation
- [Open OnDemand](https://openondemand.org/) -- the HPC portal framework
- [GitHub Wiki](https://github.com/tamu-edu/dor-hprc-drona-composer/wiki) -- additional documentation

## Citation

If you use Drona Workflow Engine, please cite our paper:
```bibtex
@inproceedings{10.1145/3731599.3767431,
  author = {Kryvenko, Andrii and Pham, Duy and Pennings, Marinus and Liu, Honggao},
  title = {Is it an HPC Workflow Assistant? Is it a Framework? It's Drona Workflow Engine},
  year = {2025},
  isbn = {9798400718717},
  publisher = {Association for Computing Machinery},
  address = {New York, NY, USA},
  url = {https://doi.org/10.1145/3731599.3767431},
  doi = {10.1145/3731599.3767431},
  abstract = {HPC resources are becoming increasingly complex, while HPC itself is becoming more popular among novice researchers across a wide range of research domains. These novice researchers often lack typical HPC skills, which results in a steep learning curve that leads to frustration and inefficient use of HPC resources. To address this, we developed Drona Workflow Engine. Drona offers an intuitive Graphical User Interface (GUI) that assists researchers in running their scientific workflows. The researcher provides the required information for their specific scientific workflow, and Drona generates all the scripts needed to run that workflow on the researcher's behalf. For transparency and additional flexibility, Drona will display all generated scripts in a fully editable preview window, allowing the researcher to make any final adjustments as needed. Drona also provides a flexible framework for importing, creating, adapting, and sharing custom scientific workflows. Drona significantly enhances researcher productivity by abstracting the underlying HPC complexities while retaining full control over their workflows.},
  booktitle = {Proceedings of the SC '25 Workshops of the International Conference for High Performance Computing, Networking, Storage and Analysis},
  pages = {705--714},
  numpages = {10},
  keywords = {High Performance Computing, Frameworks, Scientific Workflows, Batch processing, Schedulers, GUI},
  location = {},
  series = {SC Workshops '25}
}
```

## License

MIT (see [LICENSE](https://github.com/tamu-edu/dor-hprc-drona-composer/LICENSE.md) file)

## Acknowledgments

<!-- TODO: Add funding or institutional support information -->
