require_relative '../models/mailer.rb'

class RequestsController < Sinatra::Base
    def send_request(subject, body, success_msg, failure_message)
        mailer = Mailer.new
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

        success_msg = "Your Quota Request has been sent. A copy of the request has been sent to you via RT"
        failure_msg = "An error has occurred. Please email us at help@hprc.tamu.edu"

        result_msg = send_request(subject, body, success_msg, failure_msg)
        result_msg
    end
      
    post '/request/software' do
        software_request = SoftwareRequest.new
        subject, body = software_request.generate_email(params)
        
        
        success_msg = "Your Software Request has been sent. A copy of the request has been sent to you via RT"
        failure_msg = "An error has occurred. Please email us at help@hprc.tamu.edu"

        result_msg = send_request(subject, body, success_msg, failure_msg)
        result_msg
    end
end