require "sinatra/config_file"
require "sinatra/base"
require "sinatra/reloader"
require 'fileutils'

require 'erubi'
require 'open3'
require 'sqlite3'
require 'etc'

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
        # template = "templates/" + environment + ".txt"
        template = "environments/" + environment + "/template.txt"
        template_data = File.read(template)
        return template_data
    end

    get '/jobs/composer/schema/:schema' do |environment|
        # json = "schemas/" + schema + ".json"
        json = "environments/" + environment + "/schema.json"
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

    # def job_file_name(job_name)
    #     file_name = "#{job_name}.job"
    #     return file_name 
    # end


    def driver_command(driver_name)
        driver_scripts_location = settings.driver_scripts_path
        driver_path = "#{driver_scripts_location}/#{driver_name}"
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

    post '/jobs/composer/preview' do
        engine_command =  driver_command('engine')
        params_dict = params.to_json.to_s

        preview_job_script, stderr_str, status = Open3.capture3("#{engine_command} -p \'#{params_dict}\' -j")
        if !status.success?
            return stderr_str
        end

        return preview_job_script
        
    end

    
    post '/jobs/submit' do
        engine_command =  driver_command('engine')
        params_dict = params.to_json.to_s
        # return params_dict
        begin
            
            file_name = (!params[:executable_script].nil?) ? params[:executable_script][:filename] : nil
            file_content = (!params[:executable_script].nil?) ? params[:executable_script][:tempfile] : nil

            location = params[:location]

            # this helps support multiple runtime backend (tamubatch, matlabsubmit and more)
            runtime = params[:runtime]

        rescue
            return "An error ocurs, please ensure that all parameters are legal and valid."
        end

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

        # bash_script_path = generate_script(job_name, location, run_command)
        bash_script_path, stderr_str, status = Open3.capture3("#{engine_command} -p \'#{params_dict}\' -s")
        if !status.success?
            return stderr_str
        end
        if (runtime == "matlab")
            bash_command = "bash #{bash_script_path}"

        else
            bash_script_path, stderr_str, status = Open3.capture3("#{engine_command} -p \'#{params_dict}\' -t")
            if !status.success?
                return stderr_str
            end
            bash_command = "bash #{bash_script_path}"
        end

        stdout_str, stderr_str, status = Open3.capture3(bash_command)
        if status.success?
            return stdout_str
        else
            return stderr_str
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


    get "/jobs/composer/mainpaths" do
        current_user = Etc.getlogin
        group_names =  `groups #{current_user}`.split(":")[1].split(" ")
        group_names = group_names.map{|s| s.strip}
        paths = {"Home" => "/home/#{current_user}", "Scratch" => "/scratch/user/#{current_user}"}
        group_names.each do |group_name|
            groupdir = "/scratch/group/#{group_name}"
            if Dir.exist?(groupdir)
                paths[group_name] = groupdir
            end
        end
        return paths.to_json

    end

    def fetch_subdirectories(path)
        subdirectories = Dir.glob(File.join(path, '*')).select { |entry| File.directory?(entry) }
        subdirectories = subdirectories.map{|s| File.basename(s)}
        return subdirectories

    end

    get '/jobs/composer/subdirectories' do
      content_type :json
      fullpath = params['path']
      subdirectories = fetch_subdirectories(fullpath)
      return subdirectories.to_json
    end


  
end