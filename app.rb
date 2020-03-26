require 'erubi'
require 'json'
require './showquota'
require './squeue'
require './myproject'
require './utilization'
require './request_quota.rb'
require 'open3'

set :erb, :escape_html => true

if development?
  require 'sinatra/reloader'
  also_reload './showquota.rb'
  also_reload './squeue.rb'
  also_reload './myproject.rb'
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
    "Terra"
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

  # @myproject = MyProject.new
  # @allocations, @allocation_error, @myproject_out = @myproject.exec
  # Render the view
  erb :index
end

# endpoint
# https://portal-terra.hprc.tamu.edu/pun/dev/dashboard/allocations
get '/allocations.json' do 
  myproject = MyProject.new
  allocations, allocation_error = myproject.exec
  
  allocations = allocations.map { |o| Hash[o.each_pair.to_a] }
  {'data' => allocations }.to_json
end

# endpoint for request quota
post '/request_quota' do
  quota_requester = RequestQuota.new
  result = quota_requester.exec(params)
  
  result
end

delete '/jobs/:job_id' do |job_id|
  "Killing job #{job_id}"
  # No error checking (good luck)
  stdout_str, stderr_str, status = Open3.capture3("scancel #{job_id}")
end
