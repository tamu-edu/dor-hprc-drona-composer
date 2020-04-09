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

## Structure

### Sinatra backend

The Sinatra application provides some APIs that front-end application can tap into to get some information regarding the user. The application simply use [open3 gem](https://stdgems.org/open3/) to run batch script on portal node. To make the code easy to maintain, the sinatra backend simply call the backend adapter scripts ([machine_driver_scripts](./machine_driver_scripts/)) and foward the raw output of these scripts to the front-end for rendering. That being said, the sinatra backend is more like a router. The main business logic is located in [machine_driver_scripts]. 

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

As of now, the front-end is extremely simple (index.html + some JavaScript file). The JavaScript code is loaded with index.html. After the page is loaded, the front-end code will make some API call that fetch the information of the user. 

// TODO: Update this after refactoring

