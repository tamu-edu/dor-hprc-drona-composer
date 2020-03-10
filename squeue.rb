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
    jobs, error = [], nil

    output = "JOBID        NAME                 USER                     PARTITION              NODES  CPUS  STATE        TIME         TIME_LEFT    START_TIME         REASON                   NODELIST
    3947213      scTenifoldNet.Develo xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947214      scTenifoldNet.Develo xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947215      scTenifoldNet.Early_ xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947216      scTenifoldNet.Endode xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947217      scTenifoldNet.Hair   xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947218      scTenifoldNet.Late_n xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947219      scTenifoldNet.Phloem xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947220      scTenifoldNet.Stem_c xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947221      scTenifoldNet.Xylem  xulahong                 gpu                    1      28    PENDING      0:00         3-00:00:00   2020-03-12T10:32:2 Priority
    3947212      scTenifoldNet.Develo xulahong                 gpu                    1      28    RUNNING      4:22:08      2-19:37:52   2020-03-09T12:24:3 None                     tgpu-0833
    3947209      scTenifoldNet.Colume xulahong                 gpu                    1      28    RUNNING      5:54:47      2-18:05:13   2020-03-09T10:51:5 None                     tgpu-0835
    3947211      scTenifoldNet.Cortex xulahong                 gpu                    1      28    RUNNING      5:54:47      2-18:05:13   2020-03-09T10:51:5 None                     tgpu-0836
    3947069      scTenifold           xulahong                 gpu                    1      28    RUNNING      6:14:23      2-17:45:37   2020-03-09T10:32:2 None                     tgpu-0834"

    jobs = parse(output)
    [jobs, error]
  end
end
