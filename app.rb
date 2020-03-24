require 'erubi'
require 'json'
require './showquota'
require './squeue'
require './myproject'
require './utilization'

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
    "Your Dashboard"
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
  "We have received your request. Good luck getting it!"
end

get '/request_quota' do
  "We have received your request. Good luck getting it!"
end

