
# ================================================================================================
# List of phamminhtris's Project Accounts
# ------------------------------------------------------------------------------------------------
# |  Account   |  FY  | Default | Allocation |Used & Pending SUs|   Balance  |          PI        |
# ------------------------------------------------------------------------------------------------
# |122809608377|  2020|        Y|     5000.00|            -40.22|     4959.78|Liu, Honggao        |
# ------------------------------------------------------------------------------------------------
require 'open3'

class MyProject
  def to_s
    "myproject -l"
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
        # Allocation.new(new_line, nil, nil, nil, nil, nil, nil)
    end
  end

  def exec
    allocations, error = [], nil

    output = "List of phamminhtris's Project Accounts
    ------------------------------------------------------------------------------------------------
    |  Account   |  FY  | Default | Allocation |Used & Pending SUs|   Balance  |          PI        |
    ------------------------------------------------------------------------------------------------
    |122809608377|  2020|        Y|     5000.00|            -40.22|     4959.78|Liu, Honggao        |
    ------------------------------------------------------------------------------------------------"

    allocations = parse(output)
    allocations = allocations.compact
    [allocations, error]
  end
end
