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
    
    def save_file(parent_path, job_name, filename, file)
        
        job_folder_path = File.join(parent_path, job_name)
        Dir.mkdir(job_folder_path) unless File.exists?(job_folder_path)

        file_path = File.join(job_folder_path, filename)
        File.open(file_path, 'wb') do |f|
            f.write(file.read)
        end

        return file_path
    end

    def save_folder_file(parent_path, job_name, relative_path, filename, file)

        job_folder_path = File.join(parent_path, job_name)
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

    def generate_bash_script(job_name, module_list, job_folder_path, email, executable_name, run_command)
        
        job_file_path = File.join(job_folder_path, job_file_name(job_name))
        
        File.open(job_file_path, 'wb') do |f|
            # load module step
            f.write("# Load your requested modules\n")
            module_list.each { |module_name| 
                f.write("ml load #{module_name}\n")
            }
            f.write("\n")

            # move to working directory where the executable is store
            f.write("# Go to the directory where we put the script\n")
            f.write("cd #{job_folder_path}\n\n")

            f.write("# Strip Windows, macOS symbols to make sure your script unix compatible.\n")
            f.write("dos2unix #{executable_name}\n\n")

            f.write("# Run your program using provided command.\n")
            f.write("#{run_command}\n")

            f.write("# Send your result via email\n")
            if email.nil? or email.empty?
                email = "#{ENV['USER']}@tamu.edu"
            end
            f.write("bash #{settings.send_result_path} -p #{job_folder_path} -e #{email}\n\n")
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

    def generate_tamubatch_command(walltime, use_gpu, total_cpu_cores, core_per_node, total_mem, project_account, job_file_path)
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

        return "#{settings.tamubatch_path} #{walltime} #{need_gpu} #{cores} #{cores_per_node} #{total_mem} #{account} #{job_file_path}"
    end

    def parse_module(module_list_as_str) 
        modules = module_list_as_str.split("\t")
        return modules
    end

    def generate_matlabsubmit_script(job_folder_path, job_name, matlab_script, matlabsubmit_command)
        shell_script_name = "#{File.join(job_folder_path, job_name)}.sh"

        File.open(shell_script_name, 'wb') do |f|
            # load module step
            f.write("# Load default matlab module\n")
            f.write("ml load #{settings.default_matlab_module}\n\n")

            # move to working directory where the executable is store
            f.write("# Go to the directory where we put the script\n")
            f.write("cd #{job_folder_path}/\n\n")

            f.write("# Strip Windows, macOS symbols to make sure your script unix compatible.\n")
            f.write("dos2unix #{matlab_script}\n\n")

            f.write("# Submit your job using matlab submit\n")
            f.write("#{matlabsubmit_command}\n")
        end
    end

    def matlabsubmit_command(walltime, use_gpu, total_cpu_cores, core_per_node, total_mem, project_account, bash_script_path)
        # -h Shows this message
        # -m set the amount of requested memory in MEGA bytes(e.g. -m 20000)
        # -t sets the walltime; form hh:mm (e.g. -t 03:27)
        # -w sets the number of ADDITIONAL workers
        # -g indicates script needs GPU  (no value needed)
        # -b sets the billing account to use 
        # -s set number of threads for multithreading (default: 8 ( 1  when -w > 0)
        # -p set number of workers per node
        # -f run function call instead of script
        # -x add explicit batch scheduler option    
    end
    
    post '/jobs/submit' do 

        walltime = params['walltime']
        use_gpu = params['gpu']
        job_name = params[:name]
        # whitespace is your enermy, same goes for dash ;)
        # underscore is your friend. At least in file name
        job_name = job_name.gsub /[- ]/, "_"

        total_cpu_cores = params['cores']
        core_per_node = params['cores-per-node']
        total_mem = params['total-memory']
        project_account = params['project-account']
        email = params[:email]
        module_list= params['module-list'] 
        file_name = params[:executable_script][:filename]
        file = params[:executable_script][:tempfile]
        run_command = params[:run_command]
        location = params['location-path']

        # return nil.nil?

        # this helps support multiple runtime backend (tamubatch, matlabsubmit and more)
        runtime = params[:runtime]
        


        if walltime.nil? or total_cpu_cores.nil? or core_per_node.nil? or total_mem.nil? or file_name.nil?
            return "Invalid Job Compose Request."
        end



        # create job_composer folder if needed
        # user alternate path for job
        storage_path = ""
        if location.nil?
            storage_path = job_composer_data_path()
        else
            storage_path = location
        end

        

        create_folder_if_not_exist(storage_path)
        # return storage_path

        for folder_file in params[:folder_file] do
            filename = folder_file[:filename]
            # access the header content to get the relative path of file in the uploaded directory
            relative_path = folder_file[:head].split("\n")[0].split(";")[2].split("\"")[1]
            relative_path.slice!(filename)
            # return relative_path
            
            tempfile = folder_file[:tempfile]
            

            save_folder_file(storage_path, job_name, relative_path, filename, tempfile)
            # return "Hello World"
        end

        # this is the script user upload
        executable_path = save_file(storage_path, job_name, file_name, file)

        # upload folder/data
        # files = params[:folder_file].map{|file| file}.join("\n")
        
        
        # # deal with module load and go to the right directory
        job_path = File.join(storage_path, job_name)
        bash_script_path = generate_bash_script(job_name, parse_module(module_list), job_path, email, file_name, run_command)
        tamubatch_command = generate_tamubatch_command(walltime, use_gpu, total_cpu_cores, core_per_node, total_mem, project_account, bash_script_path)
        
        stdout_str, stderr_str, status = Open3.capture3(tamubatch_command)
    
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
  
end