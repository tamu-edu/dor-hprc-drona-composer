require "sinatra/config_file"
require "sinatra/base"
require "sinatra/reloader"
require 'fileutils'

require 'erubi'
require 'open3'
require 'sqlite3'

class JobsController < Sinatra::Base
    register Sinatra::ConfigFile
    config_file '../config.yml'

    configure :development do
        register Sinatra::Reloader
    end

    def driver_command(driver_name)
        driver_scripts_location = settings.driver_scripts_path
        driver_path = "#{driver_scripts_location}/#{driver_name}"
    end

    get '/jobs/list' do
        jobs_command =  driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3("#{jobs_command} -l")
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    get '/jobs/completed' do
        jobs_command =  driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3("#{jobs_command} -c")
        if status.success?
            return stdout_str
        else
            return stderr_str
        end
    end

    get '/jobs/:job_id/utilization' do |job_id|

        jobs_command =  driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3("#{jobs_command} -u #{job_id}")
        if status.success?
            return stdout_str
        else
            return stderr_str
        end
    end


   get '/jobs/:job_id/summary_completed' do |job_id|

        jobs_command =  driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3("#{jobs_command} -s #{job_id}")
        if status.success?
            return stdout_str
        else
            return stderr_str
        end
    end


    get '/jobs/:job_id/log' do |job_id|
        n_lines = 10 # default 10 lines
        if(params.has_key?(:n_lines))
            n_lines = params[:n_lines]
        end

        jobs_command =  driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3("#{jobs_command} -o #{job_id} #{n_lines}")
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    get '/jobs/:job_id/error_log' do |job_id|
        n_lines = 10 # default 10 lines
        if(params.has_key?(:n_lines))
            n_lines = params[:n_lines]
        end

        jobs_command =  driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3("#{jobs_command} -e #{job_id} #{n_lines}")
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    delete '/jobs/:job_id' do |job_id|
        # No error checking (good luck)
        jobs_command = driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3("#{jobs_command} -k #{job_id}")
    
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end
end