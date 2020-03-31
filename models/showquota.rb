require 'open3'

class ShowQuota
  def to_s
    "/sw/local/bin/showquota"
  end

  DiskQuota = Struct.new(:disk_name, :disk_usage, :disk_limit, :file_usage, :file_limit)

  def parse(output)
    output = output.gsub("Your current disk quotas are:", "")
    lines = output.strip.split("\n")
    lines.drop(1).map do |line|
      DiskQuota.new(*(line.split(" ", 5)))
    end
  end

  def exec
    quota, error = [], nil

    stdout_str, stderr_str, status = Open3.capture3(to_s)
    if status.success?
      quota = parse(stdout_str)
    else
      quota_error = "Command '#{to_s}' exited with error: #{stderr_str}"
    end

    
    [quota, quota_error]
  end
end
