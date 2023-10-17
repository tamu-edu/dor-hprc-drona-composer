require "sinatra/config_file"
require "sinatra/base"
require "sinatra/reloader"
require 'fileutils'

require 'erubi'
require 'open3'
require 'sqlite3'

class JobComposerController < Sinatra::Base
    register Sinatra::ConfigFile
    config_file '../config.yml'

    configure :development do
        register Sinatra::Reloader
    end

    # Configure controller to use different view path
    set :views, File.expand_path(File.join(__FILE__, '../../views'))
    set :erb, :escape_html => true
    @url = settings.dashboard_url

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

    get '/jobs/composer/environment/:environment' do |environment|
        template = "templates/" + environment + ".txt"
        template_data = File.read(template)
        return template_data
    end

    get '/jobs/composer/schema/:schema' do |schema|
        json = "schemas/" + schema + ".json"
        json_data = File.read(json)
        return json_data
    end
    
    def save_file(job_folder_path, filename, file)
        
        # job_folder_path = File.join(parent_path, job_name)
        Dir.mkdir(job_folder_path) unless File.exists?(job_folder_path)

        file_path = File.join(job_folder_path, filename)
        File.open(file_path, 'wb') do |f|
            f.write(file.read)
        end

        return file_path
    end

    def save_folder_file(job_folder_path, relative_path, filename, file)

        # job_folder_path = File.join(parent_path, job_name)
        Dir.mkdir(job_folder_path) unless File.exists?(job_folder_path)

        absolute_path = File.join(job_folder_path, relative_path)
        Dir.mkdir(absolute_path) unless File.exists?(absolute_path)

        file_path = File.join(absolute_path, filename)
        File.open(file_path, 'wb') do |f|
            f.write(file.read)
        end

        return
    end

    def job_file_name(job_name)
        
        file_name = "#{job_name}.job"

        return file_name 
    end

    def generate_script(job_name, module_list, job_folder_path, email, executable_name, run_command, runtime)
        job_file_path = File.join(job_folder_path, job_file_name(job_name))
        
        File.open(job_file_path, 'wb') do |f|
            f.write("# Load the template with user inputs.\n")
            unix_run_command = run_command.gsub(/\r\n?/,"\n")
            # f.write("#{unix_run_command}\n")

            modules = ""
            module_list.each { |module_name|
                modules += module_name + " "
            }

            unix_run_command = unix_run_command.gsub("[user modules]", modules)
            unix_run_command = unix_run_command.gsub("[job folder]", job_folder_path)
            if !executable_name.nil?
                unix_run_command = unix_run_command.gsub("[file name]", executable_name)
            else
                unix_run_command = unix_run_command.gsub(/\n.+\[file name\]/, "")
            end

            # if !workers.nil?
            #     unix_run_command = unix_run_command.gsub("[workers]", "-w " + workers)
            # else
            #     unix_run_command = unix_run_command.gsub(/\n.+\[workers\]/, "")
            # end

            # if !threads.nil?
            #     unix_run_command = unix_run_command.gsub("[threads]", "-s " + threads)
            # else
            #     unix_run_command = unix_run_command.gsub(/\n.+\[threads\]/, "")
            # end


            f.write("#{unix_run_command}\n")
        end

        return job_file_path
    end


    def driver_command(driver_name)
        driver_scripts_location = settings.driver_scripts_path
        driver_path = "#{driver_scripts_location}/#{driver_name}"
    end

    def job_composer_data_path()
        path = File.join('/scratch/user/', ENV['USER'])

        job_compose_path = 'job_composer'
        path = File.join(path, job_compose_path)

        return path
    end 

    def create_folder_if_not_exist(dir_path)
        
        unless File.directory?(dir_path)
            FileUtils.mkdir_p(dir_path)
        end
    end

    def generate_tamubatch_command(walltime, use_gpu, total_cpu_cores, cores_per_node, total_mem, project_account, job_file_path)
        
        # If parameters are not provided, do not include in tamubatch command

        walltime = (walltime.nil? || walltime.empty?) ? "" : "-W #{walltime} "
        use_gpu = (use_gpu.nil? || use_gpu.empty?) ? "" : "-gpu "
        total_cpu_cores = (total_cpu_cores.nil? || total_cpu_cores.empty?) ? "" : "-n #{total_cpu_cores} "
        cores_per_node = (cores_per_node.nil? || cores_per_node.empty?) ? "" : "-R #{cores_per_node} "
        
        if total_mem.strip !~ /^(MB|G)/ # if it does not start with MB or G
            total_mem = "-M #{total_mem} "
        else 
            total_mem = ""
        end
        account = (project_account.strip.empty?) ? "" : "-P #{project_account} "

        return "#{settings.tamubatch_path} #{walltime}#{use_gpu}#{total_cpu_cores}#{cores_per_node}#{total_mem}#{account}#{job_file_path}"
    end

    def parse_module(module_list_as_str) 
        modules = module_list_as_str.split("\t")
        return modules
    end

    
    post '/jobs/submit' do
        engine_command =  driver_command('engine')
        params_dict = params.to_json.to_s
        # return "#{engine_command} -p \"#{params_dict}\""

        begin
            job_name = params[:name]
            # whitespace is your enermy, same goes for dash ;)
            # underscore is your friend. At least in file name
            job_name = job_name.gsub /[- ]/, "_"
            
            walltime = params[:walltime]
            use_gpu = params[:gpu]           
            total_cpu_cores = params[:cores]
            cores_per_node = params[:cores_per_node]
            total_mem = params[:total_memory_number] + params[:total_memory_unit]
            module_list= params[:module_list]
            
            file_name = (!params[:executable_script].nil?) ? params[:executable_script][:filename] : nil
            file_content = (!params[:executable_script].nil?) ? params[:executable_script][:tempfile] : nil

            run_command = params[:run_command].gsub(/\r\n?/,"\n")

            project_account = params[:project_account]
            email = params[:email]
        
            location = params[:location]

            # this helps support multiple runtime backend (tamubatch, matlabsubmit and more)
            runtime = params[:runtime]


            # workers = params[:workers]
            # threads = params[:threads]

        rescue
            return "An error ocurs, please ensure that all parameters are legal and valid."
        end


        run_command, stderr_str, status = Open3.capture3("#{engine_command} -p \'#{params_dict}\'")
        if !status.success?
            return stderr_str
        end
        

        # if walltime.nil? or total_cpu_cores.nil? or cores_per_node.nil? or total_mem.nil?
        #     return "Invalid Job Compose Request."
        # end
    
        create_folder_if_not_exist(location)
        

        if !params[:files].nil?
            for file in params[:files] do
                filename = file[:filename]
                
                # access the header content to get the relative path of file in the uploaded directory
                # relative_path = file[:head]
                relative_path = file[:head].split("\n")[0].split(";")[2].split("\"")[1]
                relative_path.slice!(filename)
                

                tempfile = file[:tempfile]
                save_folder_file(location, relative_path, filename, tempfile)
            end
        end
        

        # this is the script user upload
        if !params[:executable_script].nil?
            executable_path = save_file(location, file_name, file_content)
        end

        bash_script_path = generate_script(job_name, parse_module(module_list), location, email, file_name, run_command, runtime)
        if (runtime == "matlab")
            matlab_command = "bash #{bash_script_path}"
            # return submit_matlab
            stdout_str, stderr_str, status = Open3.capture3(matlab_command)
            if status.success?
                return stdout_str
            else  
                return stderr_str
            end
        else
            tamubatch_command = generate_tamubatch_command(walltime, use_gpu, total_cpu_cores, cores_per_node, total_mem, project_account, bash_script_path)
            # return tamubatch_command
            stdout_str, stderr_str, status = Open3.capture3(tamubatch_command)

            if status.success?
                return stdout_str
            else  
                return stderr_str
                end
        end
        
    end

    delete "/jobs/composer/job_files/:file_name" do |file_name|
        get_job_files_command =  driver_command('job_submit_helper')
        stdout_str, stderr_str, status = Open3.capture3("#{get_job_files_command} -d #{file_name}")
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    get "/jobs/composer/submit/:file_name" do |file_name|
        get_job_files_command =  driver_command('job_submit_helper')
        
        stdout_str, stderr_str, status = Open3.capture3("#{get_job_files_command} -s #{file_name}")
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end

    get "/jobs/composer/job_files" do 
        get_job_files_command =  driver_command('job_submit_helper')
        stdout_str, stderr_str, status = Open3.capture3("#{get_job_files_command} -j")
        if status.success?
            return stdout_str
        else  
            return stderr_str
        end
    end


    post '/jobs/submit-clone' do
        begin
            job_name = params[:name]
            # whitespace is your enermy, same goes for dash ;)
            # underscore is your friend. At least in file name
            job_name = job_name.gsub /[- ]/, "_"
            
            walltime = params[:walltime]
            use_gpu = params[:gpu]           
            total_cpu_cores = params[:cores]
            cores_per_node = params[:cores_per_node]
            total_mem = params[:total_memory_number] + params[:total_memory_unit]
            module_list= params[:module_list]
            
            file_name = (!params[:executable_script].nil?) ? params[:executable_script][:filename] : nil
            file_content = (!params[:executable_script].nil?) ? params[:executable_script][:tempfile] : nil

            run_command = params[:run_command].gsub(/\r\n?/,"\n")

            project_account = params[:project_account]
            email = params[:email]
        
            location = params[:location]

            # this helps support multiple runtime backend (tamubatch, matlabsubmit and more)
            runtime = params[:runtime]


            workers = params[:workers]
            threads = params[:threads]
            

        rescue
            return "An error ocurs, please ensure that all parameters are legal and valid."
        end
        

        # if walltime.nil? or total_cpu_cores.nil? or cores_per_node.nil? or total_mem.nil?
        #     return "Invalid Job Compose Request."
        # end
    
        create_folder_if_not_exist(location)
        

        if !params[:files].nil?
            for file in params[:files] do
                filename = file[:filename]
                
                # access the header content to get the relative path of file in the uploaded directory
                # relative_path = file[:head]
                relative_path = file[:head].split("\n")[0].split(";")[2].split("\"")[1]
                relative_path.slice!(filename)
                

                tempfile = file[:tempfile]
                save_folder_file(location, relative_path, filename, tempfile)
            end
        end
        

        # this is the script user upload
        if !params[:executable_script].nil?
            executable_path = save_file(location, file_name, file_content)
        end


        bash_script_path = generate_script(job_name, parse_module(module_list), location, email, file_name, run_command, runtime, workers, threads)
        if (runtime == "matlab")
            matlab_command = "bash #{bash_script_path}"
            # return submit_matlab
            stdout_str, stderr_str, status = Open3.capture3(matlab_command)
            if status.success?
                return stdout_str
            else  
                return stderr_str
            end
        else
            tamubatch_command = generate_tamubatch_command(walltime, use_gpu, total_cpu_cores, cores_per_node, total_mem, project_account, bash_script_path)
            # return tamubatch_command
            stdout_str, stderr_str, status = Open3.capture3(tamubatch_command)

            if status.success?
                return stdout_str
            else  
                return stderr_str
                end
        end
        
    end

  
end