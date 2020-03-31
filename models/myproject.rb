require 'open3'

class MyProject
  def to_s
    "/home/slurm/bin/pre_charge list"
  end

  Allocation = Struct.new(:account, :fy, :default, :allocation, :used_pending_su, :balance, :pi)

  def parse(out)
    lines = out.strip.split("\n")
    lines = lines.drop(5)
    lines = lines.map do |line|
        line.strip.delete("-")
    end
    lines = lines.reject { |line| line.empty? }
    lines = lines.map do |line|
      line[1...-1]
    end
    lines = lines.map do |line|
      Allocation.new(*(line.split("|", 7).collect(&:strip)))
    end
    
  end

  def exec
    allocations, allocation_error = [], nil
    cache = ENV["OOD_ALLOC"]
    
    if cache.nil?
      stdout_str, stderr_str, status = Open3.capture3(to_s)
      if status.success?
        allocations = parse(stdout_str)
        ENV["OOD_ALLOC"]=stdout_str
      else
        allocation_error = "Command '#{to_s}' exited with error: #{stderr_str}"
      end
    else
      allocations = parse(cache)
    end

    [allocations, allocation_error]
  end
end
