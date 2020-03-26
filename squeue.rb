require 'open3'

class Squeue
  def to_s
    "squeue -l -u $USER"
  end
  # 
  # JOBID       PARTITION     NAME     USER      ST       TIME  NODES NODELIST(REASON)
  # 4334932     short         sys/dash phamminh  R      54:29      1 tnxt-0769


  Job = Struct.new(:id, :partition, :name, :user, :state, :time, :time_limit, :nodes , :nodelist)

  def parse(output)
    lines = output.strip.split("\n")
    # drop the first line to skip the header
    lines.drop(2).map do |line|
      Job.new(*(line.split(" ", 9)))
    end
    
  end

  def exec
    jobs, squeue_error = [], nil

    stdout_str, stderr_str, status = Open3.capture3(to_s)
    if status.success?
      jobs = parse(stdout_str)
    else
      error = "Command '#{to_s}' exited with error: #{stderr_str}"
    end

    [jobs, squeue_error]
  end
end
