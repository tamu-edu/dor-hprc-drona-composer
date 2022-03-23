# Dashboard Extension for Open OnDemand designed for High Performance Research Computing

## Introduction

The skeleton of this app is based on [OOD-Example-PS](https://github.com/OSC/ood-example-ps) repository This application is a Passenger App based on Sinatra Framework. For more information on how to get started, please head to this tutorial [Tutorials Passenger Apps](https://osc.github.io/ood-documentation/master/app-development/tutorials-passenger-apps.html).

## Sinatra

This looks like a nice framework. Check it out [here](http://sinatrarb.com/). There is also [a book](http://sinatra-org-book.herokuapp.com/).

```ruby
require 'sinatra'
get '/frank-says' do
    'Put this in your pipe & smoke it!'
end
```

## Development

**IMPORTANT NOTE**: 

It is necessary to align development and production environement. Verify the production environment.

```bash
$ ls /opt/rh
rh-git29  rh-nodejs6  rh-ruby24   httpd24   ondemand
```

Align ruby enviroment with what will be used in production. *Note*: Use the correct versions of the softwares by following the output of the command above.

```bash
$ source scl_source enable rh-git29 rh-nodejs6 rh-ruby24 httpd24 ondemand
```

Remove old gems

```bash 
$ rm -rf ./vendor
```

Then install gem dependencies
```bash
$ scl enable ondemand -- bundle
```

## Structure

### Sinatra backend

The Sinatra application provides some APIs that front-end application can tap into to get some information regarding the user. The application simply use [open3 gem](https://stdgems.org/open3/) to run batch script on portal node. To make the code easy to maintain, the sinatra backend simply call the backend adapter scripts ([machine_driver_scripts](./machine_driver_scripts/)) and foward the raw output of these scripts to the front-end for rendering. That being said, the sinatra backend is more like a router. The main business logic is located in [machine_driver_scripts]. 

### Controllers
This part of the application acts as a router that routes raw information from the driver to the requester. As of this writing, this part of the app is very simple. You can find all the supported routes in [controllers] folder. The organization idea behind it is as follow:

- [app.rb](controllers/app.rb): this controller is the main controller of the app which serves the index page as well as provide the information regarding the "dashboard_url" so that all the JavaScript code knows where to make the call to.

- [jobs.rb](controllers/jobs.rb): handles job related routes (list all jobs, kill job)

- [requests.rb](controllers/requests.rb): handles request form endpoints (software requests, quota requests)

- [resources.rb](controllers/resources.rb): handles resource related endpoints such as cluster current allocation status, user allocations, etc.

### Machine Driver scripts
This collections of program (bash, python, etc.) is the only way sinatra backend can talk to the underlying machine. This decoupling help with migration to new clusters. The main idea here is that the Sinatra backend know nothing about the machine (not 100% true but close). These scripts can be anything as long as the front-end which (also machine specific) knows how to render the information returns by those scripts. For this repository, the output of all the script is in JSON format. 

For example [machine_driver_scripts/allocations](machine_driver_scripts/allocations), fetch information about all the allocations belong to the current users. It the put this information
in a JSON format which the front-end knows how to render.

```JSON
{
  "data": [
    {
      "used_pending_su": 0,
      "account": "122809601331",
      "pi": "Liu, Honggao",
      "default": "N",
      "fy": "2020",
      "allocation": 10,
      "balance": 10
    },
    {
      "used_pending_su": -45.19,
      "account": "122809608377",
      "pi": "Liu, Honggao",
      "default": "Y",
      "fy": "2020",
      "allocation": 5000,
      "balance": 4954.81
    }
  ]
}
```

Again, the above information is machine specific and need to be adapt for each machine.

### Front-end

As of now, the front-end is extremely simple (index.html + some JavaScript file). The JavaScript code is loaded along with [views/index.erb](views/index.erb). After the page is loaded, the front-end code will make some API call that fetch the information of the user. Ideally the name of the file in the views folder should tell you what the file does. I will not
put tons of words here so that it needs to be updated later. Rather, you should dive into the code and see how they work. To give you a general idea, I will briefly explain the flow of the application.

- Sinatra load the base HTML files when the user access the dashboard app. (This has no content !!!)
- Our JavaScript code will be loaded and start fetching data provided by the Sinatra backend (discussed above). All the utility JavaScript files are located inside [public/custom/js](public/custom/js) folder.
- There is very little CSS code. Most styling is done with [Bootstrap 4](https://getbootstrap.com/) (general page layout - the grid system), [chartjs](https://www.chartjs.org/) (for cluster utility doughnut charts), [DataTable](https://datatables.net/) (renders all data tables with nice animation and sorting features), jQuery (dependency of Bootstrap 4).

## Deployment

### Development

Start by reading and following [installations.md](docs/installations/installations.md) for setting up the development of this app. Pay close attention to the app configuration section.

For a general guideline to deploy a development version of an app, follow closely the step specified by the official OOD [Passenger App Development tutorial](https://osc.github.io/ood-documentation/master/app-development/tutorials-passenger-apps/ps-to-quota.html#clone-and-setup). 

#### App Configurations

After following the instructions installations.md, the app is ready to launch. Change or add parameters to development section as you see fit. 

```yaml
development: &common_settings
    cluster_name: 'Terra'
    dashboard_url: '/pun/dev/OOD-Dashboard'
    home_page: 'https://hprc.tamu.edu'
    request_email: 'johndoe@tamu.edu'
    help_email: 'johndoe@tamu.edu'
    driver_scripts_path: '/var/www/ood/apps/dev/johndoe/gateway/OOD-Dashboard/machine_driver_scripts'

production:
    <<: *common_settings # we use the development config as the base configurations and override what are different for production environment 
    dashboard_url: '/pun/sys/OOD-Dashboard'
    request_email: 'help@hprc.tamu.edu'
    driver_scripts_path: '/var/www/ood/apps/sys/OOD-Dashboard/machine_driver_scripts'
```

To see the running app in development, access https://[portal-host]/pun/dev/[your app directory name]

Example: https://portal-terra.hprc.tamu.edu/pun/dev/OOD-Dashboard, if the app is running on Terra portal and app is named "OOD-Dashboard" after cloning (following steps in [installations.md](docs/installations/installations.md)).

### Production

1. Install dependencies

Please make sure you follow the notes about installing Gem at the beginning of this README.md. The command below is extremely important as it makes sure the production app uses the correct ruby environment.

```bash
$ source scl_source enable rh-git29 rh-nodejs6 rh-ruby24 httpd24 ondemand
```

2. Modify app configurations 

`setup` script replaces cluster-name, app-name, and user-name with corresponding arguments taken from the environment. 

Run the following command to change app configurations in config.yml and manifest.yml
```bash
$ chmod +x setup && ./setup
```

3. Copy app files/folders

After you have installed dependencies, you should follow the deployment instructions in [Publish App](https://osc.github.io/ood-documentation/master/app-development/tutorials-passenger-apps/ps-to-quota.html#publish-app) documentation section (also see [App sharing](https://osc.github.io/ood-documentation/master/app-sharing.html) for more information). One important note from experience is that you will need to set correct permissions (**INCLUDING HIDEN FOLDER!!!!!! ⚠️**). This advice is especially true for [System Installed Apps](https://osc.github.io/ood-documentation/master/app-sharing.html#system-installed-apps).
