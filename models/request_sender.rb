require 'open3'

class RequestSender

    def send(subject, body)
        send_command  = "mailx -s '#{subject}' -S replyto=$USER@tamu.edu help@hprc.tamu.edu" \
             "<<< '#{body}'"

        stdout_str, stderr_str, status = Open3.capture3(send_command)
    end
end 