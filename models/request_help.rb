require 'open3'

class HelpRequest

    def compose_email(cluster_name,  help_topic, issue_description, error_message, job_file_path, job_id, program_file_path, additional_information)

        user = ENV["USER"]
        body =  "User: #{user}\n" \
                "Cluster: #{cluster_name}\n" \
                "Help Topic: #{help_topic}\n" \
                "Issue Description: #{issue_description}\n"\
                "Error Message: #{error_message}\n" \
                "Job File: #{job_file_path}\n"\
                "Job ID: #{job_id}\n"\
                "Program File: #{program_file_path}\n"\
                "Additional Information: #{additional_information}"
        
        body = body.strip
        body
    end

    def generate_email(params)
        cluster_name = params[:cluster_name]
        help_topic = params[:help_topic]
        issue_description = params[:issue_description]
        error_message = params[:error_message]
        job_file_path = params[:job_file_path]
        job_id = params[:job_id]
        program_file_path = params[:program_file_path]
        additional_information = params[:additional_information]

      subject = "HelpRequest"
      body = compose_email(cluster_name, help_topic, issue_description, error_message, job_file_path, job_id, program_file_path, additional_information)

      [subject, body]
    end
end
