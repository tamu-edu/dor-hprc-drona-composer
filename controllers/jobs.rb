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
    
    def save_file(parent_path, filename, file)
        Dir.mkdir(parent_path) unless File.exists?(parent_path)

        file_path = File.join(parent_path, filename)
        File.open(file_path, 'wb') do |f|
            f.write(file.read)
        end

        return file_path
    end

    def generate_bash_script(module_list, job_compose_path, executable_name, run_command)
        executable_name = "tamubatch_#{executable_name}.batch"
        file_path = File.join(job_compose_path, executable_name)
        
        File.open(file_path, 'wb') do |f|
            # load module step
            f.write("# Load your requested modules\n")
            module_list.each { |module_name| 
                f.write("ml load #{module_name}\n")
            }
            f.write("\n")

            # move to working directory where the executable is store
            f.write("# Move to the directory where we put the script\n")
            f.write("cd #{job_compose_path}\n\n")

            f.write("# Run your program using provided command.\n")
            f.write("#{run_command}\n")
        end

        return file_path
    end

    def job_composer_data_path()
        path = File.join('/scratch/user/', ENV['USER'])

        job_compose_path = 'job_composer'
        path = File.join(path, job_compose_path)
        return path
    end 

    def generate_tamubatch_command(walltime, use_gpu, total_cpu_cores, core_per_node, total_mem, project_account, executable_path)
        walltime = "-W #{walltime}"
        need_gpu = ""
        if use_gpu
            need_gpu = "-gpu"
        end
        cores = "-n #{total_cpu_cores}"
        cores_per_node = "-R #{core_per_node}"
        total_mem = "-M #{total_mem}"

        account = "-P #{project_account}"
        if project_account.strip.empty?
            account = ""
        end

        return "#{settings.tamubatch_path} #{walltime} #{need_gpu} #{cores} #{cores_per_node} #{total_mem} #{account} #{executable_path}"
            
        return ""
    end

    def parse_module(module_list_as_str) 
        modules = module_list_as_str.split("\n")
        return modules
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
        run_command = params[:run_command]

        if walltime.nil? or total_cpu_cores.nil? or core_per_node.nil? or total_mem.nil? or file_name.nil?
            return "Invalid Job Compose Request."
        end


        executable_path = save_file(job_composer_data_path(), file_name, file)
        bash_script_path = generate_bash_script(parse_module(module_list), job_composer_data_path(), file_name, run_command)
        tamubatch_command = generate_tamubatch_command(walltime, use_gpu, total_cpu_cores, core_per_node, total_mem, project_account, bash_script_path)
        need_gpu = ""
        if use_gpu
            need_gpu = "-gpu"
        end
        # res = """<pre>
        # walltime = #{walltime}\n
        # use_gpu = #{need_gpu}\n
        # total_cpu_cores #{total_cpu_cores}\n
        # core_per_node #{core_per_node}\n
        # total_mem = #{total_mem}\n
        # module_list = #{module_list}\n
        # file_name = #{file_name}\n
        # file_data = #{file.read}\n
        # SCRATCH = #{executable_path}\n
        # run_command = #{run_command}\n
        # batch_body = #{bash_script_path}\n
        # tamubatch_cmd = #{tamubatch_command}\n
        # </pre>
        # """
        redirect '/'
        # return res
    end
  
end