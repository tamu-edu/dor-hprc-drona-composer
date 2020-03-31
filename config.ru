require 'sinatra'

require './controllers/resources'
require './controllers/requests'
require './controllers/app'

use ResourcesController
use RequestsController
run Sinatra::Application
