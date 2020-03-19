require 'open3'

class MyProject
  def to_s
    "/sw/local/bin/myproject -l"
  end

  Allocation = Struct.new(:account, :fy, :default, :allocation, :used_pending_su, :balance, :pi)

  def parse(output)
    output = output.gsub("-", "")
    lines = output.strip.split("\n")
    lines = lines.reject { |l| l.empty? }
    lines.drop(4).map do |line|
        new_line = line.sub("|", "").strip
        new_line = new_line.chop
        Allocation.new(*(new_line.split("|", 7)))
    end
  end

  def exec
    allocations, error = [], nil

    stdout_str, stderr_str, status = Open3.capture3(to_s)
    if status.success?
      allocations = parse(stdout_str)
    else
      allocation_error = "Command '#{to_s}' exited with error: #{stderr_str}"
    end

    [allocations, allocation_error, stdout_str]
  end
end
