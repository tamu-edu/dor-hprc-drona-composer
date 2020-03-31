
require 'open3'

class Mailer
  def compose_email_command(subject, body)
    "mailx -s '#{subject}' -S replyto=$USER@tamu.edu phamminhtris@tamu.edu <<< '#{body}'"
  end

  def send_email(subject, body)
    result, error = nil, nil

    email_command = compose_email_command(subject, body)
    stdout_str, stderr_str, status = Open3.capture3(email_command)

    return status
  end
end
