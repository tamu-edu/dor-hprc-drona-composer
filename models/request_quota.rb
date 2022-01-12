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
      buy_in = params[:confirmBuyin]
      
      request_until = params[:request_until]
      justification = params[:request_justification]
      comment = params[:comment]

      student_netid = params[:student_netid]
      
      subject = "[#{cluster_name}] Quota Request: #{user}"
      body =  "Cluster: #{cluster_name}\n" \
                "User: #{user}\n" \
                "Buy-In: #{buy_in}\n" \
                "Request Until: #{request_until}\n" \
                "--- CURRENT QUOTA ---\n" \
                "Current disk space: #{current_quota}\n" \
                "Current file limit: #{current_file_limit}\n" \
                "--- USED QUOTA ---\n" \
                "Used disk space: #{current_used_quota}\n" \
                "Used file count: #{current_used_file}\n" \
                "--- REQUESTING QUOTA ---\n" \
                "Requesting disk space: #{disk_space}TB\n" \
                "Requesting file limit: #{file_limit}\n" \
                "Justification: #{justification}\n" \
                "Comment: #{comment}\n" \
                "Student Netid or Group Name: #{student_netid}"
        
      body = body.strip
      [subject, body]
    end

    def generate_log(params)
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

      log =  "Cluster: #{cluster_name}    " \
                "User: #{user}    " \
                "Current disk space: #{current_quota}    " \
                "Current file limit: #{current_file_limit}    " \
                "Used disk space: #{current_used_quota}    " \
                "Used file count: #{current_used_file}    " \
                "Student Netid: #{student_netid}    " \
                "Request Until: #{request_until}    " \
                "Requesting disk space: #{disk_space}TB    " \
                "Requesting file limit: #{file_limit}\n" 
      log = log.strip
      log
    end
end
