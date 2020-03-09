require 'minitest_helper'
require 'command'

class TestCommand < Minitest::Test

  def test_command_output_parsing
    output = <<-EOF

efranz    30328  0.1  0.1 462148 28128 ?        Sl   20:28   0:00 Passenger RackApp: /users/PZS0562/efranz/awesim/dev/ood-example-ps

EOF
    processes = Command.new.parse(output)

    assert_equal 1, processes.count

    p = processes.first

    assert_equal "efranz", p.user
    assert_equal "462148", p.vsz
    assert_equal "28128", p.rss
    assert_equal "0:00", p.time
    assert_equal "Passenger RackApp: /users/PZS0562/efranz/awesim/dev/ood-example-ps", p.command
  end
end
