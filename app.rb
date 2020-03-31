require 'erubi'
require 'json'
require './models/showquota.rb'
require './models/squeue.rb'
require './models/myproject.rb'
require './models/utilization.rb'
require './request_quota.rb'
require './request_software.rb'
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
  @showquota = ShowQuota.new
  @quota, @quota_error = @showquota.exec

  @squeue = Squeue.new
  @jobs, @squeue_error = @squeue.exec

  @utilization = Utilization.new
  @usages, @usage_error = @utilization.exec

  erb :index
end

# endpoint
# /pun/dev/dashboard/allocations
get '/allocations.json' do 
  myproject = MyProject.new
  allocations, allocation_error = myproject.exec
  
  allocations = allocations.map { |o| Hash[o.each_pair.to_a] }
  {'data' => allocations }.to_json
end

get '/cluster_utilization.json' do 
  utilization = Utilization.new
  usages, usage_error = utilization.exec

  usages = usages.map { |o| Hash[o.each_pair.to_a] }
  {'data' => usages }.to_json
end

# endpoint for request quota
post '/request_quota' do
  quota_requester = RequestQuota.new
  result = quota_requester.exec(params)
  
  result
end

post '/request_software' do
  software_requester = RequestSoftware.new
  result = software_requester.exec(params)
  
  result
end

delete '/jobs/:job_id' do |job_id|
  "Killing job #{job_id}"
  # No error checking (good luck)
  stdout_str, stderr_str, status = Open3.capture3("scancel #{job_id}")
end
