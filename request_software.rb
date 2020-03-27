require 'open3'

class RequestSoftware

    def compose_email(cluster_name, software_link, toolchains, justification, additional_notes)
        user = ENV["USER"]
        body =  "User: #{user}\n" \
                "Cluster: #{cluster_name}\n" \
                "Software Link: #{software_link}\n"\
                "Toolchains: #{toolchains}\n" \
                "Justification: #{justification}\n" \
                "Additional Notes: #{additional_notes}"

        "mailx -s '[Software Request]' -S replyto=$USER@tamu.edu phamminhtris@tamu.edu" \
             "<<< '#{body}'"
    end

    def email_request(params)
        cluster_name = params[:cluster_name]
        justification = params[:request_justification]
        software_link = params[:software_link]
        toolchains = params[:toolchains]
        additional_notes = params[:additional_notes]

        return compose_email(cluster_name, software_link, toolchains, justification, additional_notes)
    end

    def exec(params)
        result, error = nil, nil

        stdout_str, stderr_str, status = Open3.capture3(email_request(params))
        result = "Your request has been submitted. An email has been seen to your account."
    
        return result
    end
end
