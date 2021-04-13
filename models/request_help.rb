require 'open3'

class HelpRequest

    def compose_email(cluster_name,  help_topic, issue_description, error_message, job_file_path, job_id, program_file_path, additional_information)

        user = ENV["USER"]
        body =  "Help Topic: #{help_topic}\n" \
                "User: #{user}\n" \
                "Cluster: #{cluster_name}\n" \
                "\n" \
                "Issue Description: #{issue_description}\n" \
                "\n" \
                "Error Message: #{error_message}\n" \
                "\n" \
                "\n" \
                "Job File: #{job_file_path}\n"\
                "\n" \
                "Job ID: #{job_id}\n"\
                "\n" \
                "\n" \
                "Program File: #{program_file_path}\n\n" \
                "Additional Information: #{additional_information}" \
        
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

      subject = "Portal Help Request: " + help_topic
      body = compose_email(cluster_name, help_topic, issue_description, error_message, job_file_path, job_id, program_file_path, additional_information)

      [subject, body]
    end
end
