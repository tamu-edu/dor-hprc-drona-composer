require 'open3'

class Utilization
  def to_s
    "/sw/local/bin/utilization.sh"
  end

  Usage = Struct.new(:resource, :used, :total, :percent)

  # Parse a string output from the `ps aux` command and return an array of
  # AppProcess objects, one per process
  def parse(output)
    lines = output.strip.split("\n")
    lines.map do |line|
      Usage.new(*(line.split(" ", 4)))
    end
  end

  # Execute the command, and parse the output, returning and array of
  # AppProcesses and nil for the error string.
  #
  # returns [Array<Array<AppProcess>, String] i.e.[processes, error]
  def exec
    usages, usage_error = [], nil

    stdout_str, stderr_str, status = Open3.capture3(to_s)
    if status.success?
      usages = parse(stdout_str)
    else
      usage_error = "Command '#{to_s}' exited with error: #{stderr_str}"
    end

    [usages, usage_error]
  end
end
