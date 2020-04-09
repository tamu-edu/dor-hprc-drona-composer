require 'erubi'
require 'json'
require './models/request_quota.rb'
require './models/request_software.rb'
require 'open3'
require "sinatra/config_file"

set :erb, :escape_html => true

register Sinatra::ConfigFile
config_file './config.yml'

if development?
  require 'sinatra/reloader'
  also_reload './models/showquota.rb'
  also_reload './models/squeue.rb'
  also_reload './models/myproject.rb'
  also_reload './models/utilization.rb'
end

helpers do
  def driver_command(driver_name)
    driver_scripts_location = settings.driver_scripts_path
    driver_path = "#{driver_scripts_location}/#{driver_name}"
  end
end

# Define a route at the root '/' of the app.
get '/' do
  @url = settings.dashboard_url
  erb :index
end

