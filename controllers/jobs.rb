class JobsController < Sinatra::Base
    get '/jobs' do
        squeue = Squeue.new
        jobs, squeue_error = squeue.exec

        json_jobs = jobs.map { |o| Hash[o.each_pair.to_a] }
        {'data' => json_jobs }.to_json
    end

    delete '/jobs/:job_id' do |job_id|
        # No error checking (good luck)
        stdout_str, stderr_str, status = Open3.capture3("scancel #{job_id}")
        
        result_msg = nil
        if status.success?
            result_msg = stdout_str
        else
            result_msg = stderr_str
        end
        
        result_msg
    end
  
end