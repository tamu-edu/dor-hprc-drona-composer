require 'open3'

class ShowQuota
  def to_s
    "showquota"
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

    output = "Your current disk quotas are:
    Disk       Disk Usage      Limit    File Usage      Limit
    /home          293.8M        10G          2892      10000
    /scratch       13.13G         1T        139856     250000"

    quota = parse(output)
    [quota, error]
  end
end
