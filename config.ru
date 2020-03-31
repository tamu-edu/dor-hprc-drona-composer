require 'sinatra'

require './controllers/resources'
require './controllers/requests'
require './controllers/jobs'
require './controllers/app'

use ResourcesController
use RequestsController
use JobsController
run Sinatra::Application
