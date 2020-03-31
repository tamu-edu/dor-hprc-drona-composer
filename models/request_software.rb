require 'open3'

class SoftwareRequest

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

        body.strip
    end

    def generate_email(params)
        cluster_name = params[:cluster_name]
        justification = params[:request_justification]
        software_name = params[:software_name]
        software_version = params[:software_version]
        software_link = params[:software_link]
        toolchains = params[:toolchains]
        additional_notes = params[:additional_notes]

        subject = "SoftwareReq"
        body = compose_email(cluster_name, software_name, software_version, 
            software_link, toolchains, justification, additional_notes)
        return [subject, body]
    end

end
