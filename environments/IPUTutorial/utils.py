import math
import os
import sys
import subprocess
from datetime import date

def drona_add_additional_file(a,b):
   return ""

def drona_add_mapping(a,b):
   return ""



init_tutorial = '''
#!/bin/bash
source /etc/profile

cd /localdata/${USER}

mkdir -p tmp
mkdir -p ipu_labs

cd ipu_labs

mkdir -p IPU-Training/PyTorch
mkdir -p IPU-Training/Keras

echo "export TF_POPLAR_FLAGS=--executable_cache_path=/localdata/${USER}/tmp" > setup.env
echo "export POPTORCH_CACHE_DIR=/localdata/${USER}/tmp" >> setup.env
echo "export TORCH_HOME=/localdata/${USER}/tmp/" >> setup.env

#this command clones the examples from the official GraphCore  github page
git clone https://github.com/graphcore/examples.git

'''


tf_example = '''
#!/bin/bash
source /etc/profile

source /usr/local/bin/source.poplar.sh

cd /localdata/${USER}/ipu_labs
source setup.env

virtualenv -p python3 venv_tf2
source venv_tf2/bin/activate
python -m pip install /opt/gc/poplar/poplar_sdk-ubuntu_20_04-3.3.0+1403-208993bbb7/tensorflow-2.6.3+gc3.3.0+251582+08d96978c7f+intel_skylake512-cp38-cp38-linux_x86_64.whl

cd examples/tutorials/tutorials/tensorflow2/keras/completed_demos/
python completed_demo_ipu.py

'''

pt_example = '''
#!/bin/bash
source /etc/profile
source /usr/local/bin/source.poplar.sh

cd /localdata/${USER}/ipu_labs
source setup.env

virtualenv -p python3 poptorch_test
source poptorch_test/bin/activate

python -m pip install /opt/gc/poplar/poplar_sdk-ubuntu_20_04-3.3.0+1403-208993bbb7/poptorch-3.3.0+113432_960e9c294b_ubuntu_20_04-cp38-cp38-linux_x86_64.whl

cd examples/tutorials/simple_applications/pytorch/mnist/
python mnist_poptorch.py

'''


poptorch_driver='''
#!/bin/bash
source /etc/profile

source /usr/local/bin/source.poplar.sh

cd /localdata/${USER}/ipu_labs
source setup.env

source poptorch_test/bin/activate

cd IPU-Training/PyTorch

pip install -r requirements.txt

python fashion-mnist-pytorch-ipu-todo.py

'''

keras_driver= '''
#!/bin/bash
source /etc/profile

source /usr/local/bin/source.poplar.sh

cd /localdata/${USER}/ipu_labs
source setup.env
source venv_tf2/bin/activate

cd IPU-Training/Keas

python mnist-ipu-todo.py
'''

replication_driver = '''
#!/bin/bash
source /etc/profile

source /usr/local/bin/source.poplar.sh

cd /localdata/${USER}/ipu_labs
source setup.enva
source venv_tf2/bin/activate

cd IPU-Training/Keras

python mnist_ipu_replicated_todo.py
'''


base_path="/scratch/user/"+os.environ.get("USER")+"/drona_composer/environments/IPUTutorial"

def setup_module(module):
    drona_add_additional_file(base_path+"/runcommand.sh","run command")
    if module == "setup":
        drona_add_mapping("runcommand",init_tutorial)
        drona_add_mapping("filestocopy", "runcommand.sh")
        drona_add_mapping("copydir",".")
        return "setup"
    elif module == "runtf":
        drona_add_mapping("runcommand",tf_example)
        drona_add_mapping("filestocopy", "runcommand.sh")
        drona_add_mapping("copydir",".")
        return f"runtf"
    elif module == "runpt":
        drona_add_mapping("runcommand",pt_example)
        drona_add_mapping("filestocopy", "runcommand.sh")
        drona_add_mapping("copydir",".")
        return f"runpt"
    if module == "PyTorch":
        drona_add_additional_file(base_path+"/IPU-Training/PyTorch/fashion-mnist-pytorch-ipu-todo.py","fashion-mnist-pytorch-ipu-todo.py")
        drona_add_additional_file(base_path+"/IPU-Training/PyTorch/fashion-mnist-pytorch-ipu-todo-solution.py","fashion-mnist-pytorch-ipu-todo-solution.py")
        drona_add_additional_file(base_path+"/IPU-Training/PyTorch/requirements.txt","requirements.txt",-1)
        drona_add_mapping("runcommand",poptorch_driver)
        drona_add_mapping("filestocopy","runcommand.sh requirements.txt fashion-mnist-pytorch-ipu-todo-solution.py fashion-mnist-pytorch-ipu-todo.py")
        drona_add_mapping("copydir","/localdata/${USER}/ipu_labs/IPU-Training/PyTorch")
        return f"PyTorch"
    elif module == "Keras":
        drona_add_additional_file(base_path+"/IPU-Training/Keras/mnist-ipu-todo.py","mnist-ipu-todo.py")
        drona_add_additional_file(base_path+"/IPU-Training/Keras/mnist-ipu-solution.py","mnist-ipu-solution.py")
        drona_add_mapping("runcommand",keras_driver)
        drona_add_mapping("filestocopy","runcommand.sh mnist-ipu-todo.py mnist-ipu-solution.py")
        drona_add_mapping("copydir","/localdata/${USER}/ipu_labs/IPU-Training/Keras")
        return f"Keras"
    else:
        drona_add_additional_file(base_path+"/IPU-Training/Keras/mnist_ipu_replicated_todo.py","mnist_ipu_replicated_todo.py")
        drona_add_additional_file(base_path+"/IPU-Training/Keras/mnist_ipu_replicated_solution.py","mnist_ipu_replicated_solution.py")
        drona_add_mapping("runcommand",replication_driver)
        drona_add_mapping("filestocopy","runcommand.sh mnist_ipu_replicated_todo.py mnist_ipu_replicated_solution.py")
        drona_add_mapping("copydir","/localdata/${USER}/ipu_labs/IPU-Training/Keras")
        return f"Replication"

