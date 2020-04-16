require "sinatra/config_file"
require 'open3'

class ResourcesController < Sinatra::Base
    register Sinatra::ConfigFile
    config_file '../config.yml'

    def driver_command(driver_name)
        driver_scripts_location = settings.driver_scripts_path
        driver_path = "#{driver_scripts_location}/#{driver_name}"
    end

    get '/resources/allocations' do
        get_allocation_command = driver_command('allocations')
        stdout_str, stderr_str, status = Open3.capture3("#{get_allocation_command} -l")
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    put '/resources/allocations/default/:account_no' do |account_no|
        get_allocation_command = driver_command('allocations')
        stdout_str, stderr_str, status = Open3.capture3("#{get_allocation_command} -d #{account_no}")
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    get '/resources/cluster/utilization' do 
        get_utilization_command = driver_command('utilization')
        stdout_str, stderr_str, status = Open3.capture3(get_utilization_command)
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    get '/resources/disk/quota' do
        get_quota_command = driver_command('showquota')
        
        stdout_str, stderr_str, status = Open3.capture3(get_quota_command)
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end
end