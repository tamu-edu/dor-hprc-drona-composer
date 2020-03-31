require 'sinatra'

require './controllers/resources'
require './controllers/app'

use ResourcesController
run Sinatra::Application
