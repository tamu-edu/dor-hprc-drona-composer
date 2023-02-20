require 'sinatra'

require './controllers/job_composer'
require './controllers/app'

use JobComposerController

run Sinatra::Application
