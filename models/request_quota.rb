require 'open3'

class QuotaRequest
    def generate_email(params)
      
      cluster_name = params[:cluster_name]
      user = ENV["USER"]

      current_quota = params[:current_quota]
      current_file_limit = params[:current_file_limit]

      disk_space = params[:desired_disk]
      file_limit = params[:total_file_limit]
      justification = params[:request_justification]
      
      subject = "[#{cluster_name}] Quota Request: #{user}"
      body =  "Cluster: #{cluster_name}\n" \
                "User: #{user}\n" \
                "------------------------------------------------------------\n" \
                "Current disk space: #{current_quota}\n" \
                "Current file limit: #{current_file_limit}\n" \
                "------------------------------------------------------------\n" \
                "Requesting disk space: #{disk_space}\n" \
                "Requesting file limit: #{file_limit}\n" \
                "Justification: #{justification}"
        
      body = body.strip
      [subject, body]
    end
end
