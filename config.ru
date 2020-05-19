require 'sinatra'

require './controllers/resources'
require './controllers/requests'
require './controllers/jobs'
require './controllers/job_composer'
require './controllers/app'

use ResourcesController
use RequestsController
use JobsController
use JobComposerController

run Sinatra::Application
