#!/bin/env python

import argparse
import shutil
import os

def is_valid_path(path):
    return os.path.isdir(path)

def zip(path):
    name = "output"
    out_name = os.path.join(path, name) # extension will be added automatically
    return shutil.make_archive(out_name, 'zip', path)

def main():
    parser = argparse.ArgumentParser("""
        Email a job folder. 
        Note: This program won't check for the size of the input for efficiency reason. 
        PLease make sure you check the input size before run this program.""")
    parser.add_argument('-p', '--path', type=str, nargs=1, required=True)
    parser.add_argument('-e', '--email', type=str, nargs=1, required=True)
    args = parser.parse_args()

    folder_path = args.path[0]
    email = args.email[0]

    if not is_valid_path(path=folder_path):
        print("Invalid folder. Abort!")
        exit(1)

    zipfile = zip(folder_path)
    print(zipfile)

if __name__ == "__main__":
    main()