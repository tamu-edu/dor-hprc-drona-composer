require_relative '../models/mailer.rb'
require_relative '../models/request_help.rb'
require_relative '../models/request_quota.rb'
require_relative '../models/request_software.rb'


require "sinatra/config_file"


class RequestsController < Sinatra::Base
    register Sinatra::ConfigFile
    config_file '../config.yml'

    def send_request(subject, body, success_msg, failure_message)
        
        body = body.strip.gsub(/\r\n?/, "\n")

        mailer = Mailer.new(settings.request_email)
        status  = mailer.send_email(subject, body)

        message = nil
        if status.success?
            message = success_msg
        else
            message = failure_message
        end

        message
    end


    post '/request/quota' do
        quota_request = QuotaRequest.new
        subject, body = quota_request.generate_email(params)
        # File.write("../logs/quota_log.txt", "Hello", mode: "a")
        # log = quota_request.generate_log(params)

        # File.write("../logs/quota_log.txt", log, mode: "a")

        success_msg = "Your Quota Request has been sent. A copy of the request has been sent to you via RT"
        failure_msg = "An error has occurred. Please email us at #{settings.help_email}"

        result_msg = send_request(subject, body, success_msg, failure_msg)
        result_msg
    end
      
    post '/request/software' do
        software_request = SoftwareRequest.new
        subject, body = software_request.generate_email(params)
        
        success_msg = "Your Software Request has been sent. A copy of the request has been sent to you via RT"
        failure_msg = "An error has occurred. Please email us at #{settings.help_email}"

        result_msg = send_request(subject, body, success_msg, failure_msg)
        result_msg
    end

    post '/request/help' do
        help_request = HelpRequest.new
        subject, body = help_request.generate_email(params)
        
        success_msg = "Your Help Request has been sent. A copy of the request has been sent to you via RT"
        failure_msg = "An error has occurred. Please email us at #{settings.help_email}"

        result_msg = send_request(subject, body, success_msg, failure_msg)
        result_msg
    end
end