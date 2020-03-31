
class ResourcesController < Sinatra::Base
    get '/resources/allocations' do
        myproject = MyProject.new
        allocations, allocation_error = myproject.exec
  
        allocations = allocations.map { |o| Hash[o.each_pair.to_a] }
        {'data' => allocations }.to_json
    end
end