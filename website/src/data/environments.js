// Environments in Drona's default environment repository (tamu-edu/dor-hprc-drona-environments,
// branch drona-v2), for the homepage's environments section. Descriptions are shortened from the
// repository's metadata.json; icons are copied from the environments' icon.png into
// static/img/environments/. An entry without an icon shows its initials.
const environments = [
  {
    name: 'AlphaFold',
    category: 'Bio',
    icon: 'img/environments/alphafold.png',
    description:
      'Predict protein structures with AlphaFold 2 or 3, then explore scores and the 3D structure without leaving Drona.',
  },
  {
    name: 'Parabricks',
    category: 'Bio',
    description: 'Run NVIDIA Parabricks genome analysis on GPUs through a guided form.',
  },
  {
    name: 'LAMMPS',
    category: 'Scientific',
    icon: 'img/environments/lammps.png',
    description:
      'Analyzes your LAMMPS input, suggests matching modules and acceleration, and charts the simulation as it runs.',
  },
  {
    name: 'MATLAB',
    category: 'Scientific',
    icon: 'img/environments/matlab.png',
    description: 'Run MATLAB jobs, with an optional parallel pool and GPU.',
  },
  {
    name: 'R-ACES',
    category: 'Scientific',
    description: 'Run R scripts as batch jobs.',
  },
  {
    name: 'tamulauncher',
    category: 'Scientific',
    icon: 'img/environments/tamulauncher.png',
    description:
      'Run thousands of small commands in a single job, spread over one or more nodes.',
  },
  {
    name: 'PyTorch-Lightning',
    category: 'ML',
    icon: 'img/environments/pytorch-lightning.png',
    description:
      'Train PyTorch Lightning models on one or more GPUs, with a live training dashboard.',
  },
  {
    name: 'Python',
    category: 'General',
    icon: 'img/environments/python.png',
    description: 'Pick or create a Python environment and run your script.',
  },
  {
    name: 'Generic',
    category: 'General',
    icon: 'img/environments/generic.png',
    description:
      'Any Slurm job, with help for modules and resources. The place to start when no specialised environment fits.',
  },
  {
    name: 'WorkflowHistory',
    category: 'General',
    icon: 'img/environments/workflowhistory.png',
    description: 'Browse, rerun and remove your workflows from every environment in one place.',
  },
];

export default environments;
