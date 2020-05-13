require "sinatra/config_file"
require 'erubi'
require 'open3'
require 'sqlite3'

class JobsController < Sinatra::Base
    register Sinatra::ConfigFile
    config_file '../config.yml'
    # add this line
    set :views, File.expand_path(File.join(__FILE__, '../../views'))
    set :erb, :escape_html => true
    @url = settings.dashboard_url

    def driver_command(driver_name)
        driver_scripts_location = settings.driver_scripts_path
        driver_path = "#{driver_scripts_location}/#{driver_name}"
    end

    get '/jobs' do
        jobs_command =  driver_command('jobs')
        stdout_str, stderr_str, status = Open3.capture3("#{jobs_command} -l")
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

    get '/jobs/composer' do 
        erb :_job_composer
    end


    # this is for autosuggestion endpoint for module search
    get '/jobs/composer/modules' do 
        query = params[:query]
        modules_db = SQLite3::Database.open settings.modules_db_path
    
        results = modules_db.execute( "SELECT name FROM modules WHERE name LIKE '#{query}%'" ) 
        a = results.map{|s| s[0] }
    
        res = {'data' => a } 
        return res.to_json
    end
  
  
    post '/jobs/submit' do 
        walltime = params['walltime']
        use_gpu = params['gpu']
        total_cpu_cores = params['cores']
        core_per_node = params['cores-per-node']
        total_mem = params['total-memory']
        project_account = params['project-account']
        module_list= params['module-list'] 
        file_name = params[:executable_script][:filename]
        file = params[:executable_script][:tempfile]
    
        res = """
        walltime = #{walltime}\n
        use_gpu = #{use_gpu}\n
        total_cpu_cores #{total_cpu_cores}\n
        core_per_node #{core_per_node}\n
        total_mem = #{total_mem}\n
        module_list = #{module_list}\n
        file_name = #{file_name}\n
        file_data = #{file.read}\n
        """
        return res
    end
  
end