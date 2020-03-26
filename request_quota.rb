require 'open3'

class RequestQuota

    def compose_email(cluster_name, file_limit, disk_space, justification)
        user = ENV["USER"]
        body =  "User: #{user}\n" \
                "Cluster: #{cluster_name}\n" \
                "File limit: #{file_limit}\n"\
                "Disk space: #{disk_space}\n" \
                "Justification: #{justification}\n"

        "mailx -s '[Quota Request]' -S replyto=$USER@tamu.edu phamminhtris@tamu.edu" \
             "<<< '#{body}'"
    end

    def email_request(params)
      justfication = params[:request_justification]
      file_limit = params[:total_file_limit]
      disk_space = params[:desired_disk]
      cluster_name = params[:cluster_name]

      return compose_email(cluster_name, file_limit, disk_space, justfication)
    end

    def exec(params)
        result, error = nil, nil

        stdout_str, stderr_str, status = Open3.capture3(email_request(params))
        result = "Your request has been submitted. An email has been seen to your account."
    
        return result
    end
end
