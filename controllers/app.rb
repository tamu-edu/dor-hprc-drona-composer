require 'erubi'
require 'json'
require './models/showquota.rb'
require './models/squeue.rb'
require './models/myproject.rb'
require './models/utilization.rb'
require './models/request_quota.rb'
require './models/request_software.rb'
require 'open3'

set :erb, :escape_html => true

if development?
  require 'sinatra/reloader'
  also_reload './models/showquota.rb'
  also_reload './models/squeue.rb'
  also_reload './models/myproject.rb'
  also_reload './models/utilization.rb'
end

helpers do
  def dashboard_title
    "Open OnDemand"
  end

  def dashboard_url
    "/pun/sys/dashboard/"
  end

  def title
    "Dashboard"
  end

  def cluster_name
    "terra"
  end
end

# Define a route at the root '/' of the app.
get '/' do
  erb :index
end


delete '/jobs/:job_id' do |job_id|
  "Killing job #{job_id}"
  # No error checking (good luck)
  stdout_str, stderr_str, status = Open3.capture3("scancel #{job_id}")
end
