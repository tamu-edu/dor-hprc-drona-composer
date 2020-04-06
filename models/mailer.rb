
require 'open3'

class Mailer
  
  def initialize(des_email)  
    # Instance variables  
    @recipient_email = des_email 
  end  

  def compose_email_command(subject, body)
    "mailx -s '#{subject}' -S replyto=$USER@tamu.edu #{@recipient_email} <<< '#{body}'"
  end

  def send_email(subject, body)
    result, error = nil, nil

    email_command = compose_email_command(subject, body)
    stdout_str, stderr_str, status = Open3.capture3(email_command)

    return status
  end
end
