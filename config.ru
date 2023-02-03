require 'sinatra'

require './controllers/job_composer'
require './controllers/app'
require './controllers/jobs'

use JobComposerController
use JobsController

run Sinatra::Application
