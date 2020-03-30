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

// TODO: Still refactoring the code.

### Sinatra backend

The Sinatra application provides some APIs that front-end application can tap into to get some information regarding the user. The application simply use [open3 gem](https://stdgems.org/open3/) to run batch script on portal node. Currently, most of the application logic can be found in [app.rb](app.r). To make the structure simple (maybe a bit too verbose), each bash command (yeah bash!) is implemented in a separate ruby file.

For example, [squeue.rb](squeue.rb) implements squeue command (Slurm). 

### Front-end

As of now, the front-end is extremely simple (index.html + some JavaScript file). The JavaScript code is loaded with index.html. After the page is loaded, the front-end code will make some API call that fetch the information of the user. 

// TODO: Update this after refactoring

