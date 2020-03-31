require 'open3'

class RequestSoftware

    def compose_email(cluster_name, software_name, software_version, 
            software_link, toolchains, justification, additional_notes)

        user = ENV["USER"]
        body =  "User: #{user}\n" \
                "Cluster: #{cluster_name}\n" \
                "Name: #{software_name}\n" \
                "Version: #{software_version}\n" \
                "Software Link: #{software_link}\n"\
                "Toolchains: #{toolchains}\n" \
                "Justification: #{justification}\n" \
                "Additional Notes: #{additional_notes}"

        "mailx -s '[Software Request]' -S replyto=$USER@tamu.edu help@hprc.tamu.edu" \
             "<<< '#{body}'"
    end

    def email_request(params)
        cluster_name = params[:cluster_name]
        justification = params[:request_justification]
        software_name = params[:software_name]
        software_version = params[:software_version]
        software_link = params[:software_link]
        toolchains = params[:toolchains]
        additional_notes = params[:additional_notes]

        return compose_email(cluster_name, software_name, software_version, 
            software_link, toolchains, justification, additional_notes)
    end

    def exec(params)
        result, error = nil, nil

        stdout_str, stderr_str, status = Open3.capture3(email_request(params))
        result = "Your request has been submitted. A receipt has been sent to your account."
    
        return result
    end
end
