require 'erubi'
# require './command'
require './showquota'

set :erb, :escape_html => true

if development?
  require 'sinatra/reloader'
  # also_reload './command.rb'
  also_reload './showquota.rb'
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
  # @command = Command.new
  # @processes, @error = @command.exec

  @showquota = ShowQuota.new
  @quota, @error = @showquota.exec

  # Render the view
  erb :index
end
