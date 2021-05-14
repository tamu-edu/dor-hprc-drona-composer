require 'open3'

class QuotaRequest

    def compose_email(user, cluster_name, file_limit, disk_space, justification)
        body =  "User: #{user}\n" \
                "Cluster: #{cluster_name}\n" \
                "File limit: #{file_limit}\n"\
                "Disk space: #{disk_space}\n" \
                "Justification: #{justification}"
        
        body = body.strip
        body
    end

    def generate_email(params)
      justfication = params[:request_justification]
      file_limit = params[:total_file_limit]
      disk_space = params[:desired_disk]
      cluster_name = params[:cluster_name]
      user = ENV["USER"]

      subject = "[#{cluster_name}] Quota Request: #{user}"
      body = compose_email(user, cluster_name, file_limit, disk_space, justfication)

      [subject, body]
    end
end
