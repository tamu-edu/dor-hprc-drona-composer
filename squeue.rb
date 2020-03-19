require 'open3'

class Squeue
  def to_s
    "squeue -u $USER"
  end

  Job = Struct.new(:id, :name, :user, :partition, :nodes, :cpus, :state, :time, :time_left, :start_time, :reason, :nodelist)

  def parse(output)
    lines = output.strip.split("\n")
    # drop the first line to skip the header
    lines.drop(1).map do |line|
      Job.new(*(line.split(" ", 12)))
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

    [jobs, squeue_error, stdout_str]
  end
end
