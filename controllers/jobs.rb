require "sinatra/config_file"
require 'open3'

class JobsController < Sinatra::Base
    register Sinatra::ConfigFile
    config_file '../config.yml'

    def driver_command(driver_name)
        driver_scripts_location = settings.driver_scripts_path
        driver_path = "#{driver_scripts_location}/#{driver_name}"
    end

    get '/jobs' do
        get_jobs_command = driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3(get_jobs_command)
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    delete '/jobs/:job_id' do |job_id|
        # No error checking (good luck)
        stdout_str, stderr_str, status = Open3.capture3("scancel #{job_id}")
        
        result_msg = nil
        if status.success?
            result_msg = stdout_str
        else
            result_msg = stderr_str
        end
        
        result_msg
    end
  
end