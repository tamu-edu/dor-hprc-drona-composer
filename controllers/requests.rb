require_relative '../models/mailer.rb'

class RequestsController < Sinatra::Base
    post '/request/quota' do
        quota_request = QuotaRequest.new
        subject, body = quota_request.generate_email(params)
        
        mailer = Mailer.new
        status  = mailer.send_email(subject, body)

        message = nil
        if status.success?
            message = "Your quota request has been sent. A copy of the request has been sent to you via RT"
        else
            message = "An error has occurred. Please email us at help@hprc.tamu.edu"
        end

        message
    end
      
    post '/request/software' do
        software_requester = RequestSoftware.new
        result = software_requester.exec(params)
        
        result
    end
end