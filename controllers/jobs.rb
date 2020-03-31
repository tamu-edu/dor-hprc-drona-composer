class JobsController < Sinatra::Base
    get '/jobs' do
        squeue = Squeue.new
        jobs, squeue_error = squeue.exec

        json_jobs = jobs.map { |o| Hash[o.each_pair.to_a] }
        {'data' => json_jobs }.to_json
    end

end