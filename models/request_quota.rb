require 'open3'

class QuotaRequest
    def generate_email(params)
      
      cluster_name = params[:cluster_name]
      user = ENV["USER"]

      current_quota = params[:current_quota]
      current_file_limit = params[:current_file_limit]

      current_used_quota = params[:current_used_disk_quota]
      current_used_file = params[:current_used_file]

      disk_space = params[:desired_disk]
      file_limit = params[:total_file_limit]
      student_netid = params[:student_netid]
      request_until = params[:request_until]
      justification = params[:request_justification]
      
      subject = "[#{cluster_name}] Quota Request: #{user}"
      body =  "Cluster: #{cluster_name}\n" \
                "User: #{user}\n" \
                "--- CURRENT QUOTA ---\n" \
                "Current disk space: #{current_quota}\n" \
                "Current file limit: #{current_file_limit}\n" \
                "--- USED QUOTA ---\n" \
                "Used disk space: #{current_used_quota}\n" \
                "Used file count: #{current_used_file}\n" \
                "--- REQUESTING QUOTA ---\n" \
                "Student Netid: #{student_netid}\n" \
                "Request Until: #{request_until}\n" \
                "Requesting disk space: #{disk_space}\n" \
                "Requesting file limit: #{file_limit}\n" \
                "Justification: #{justification}"
        
      body = body.strip
      [subject, body]
    end
end
