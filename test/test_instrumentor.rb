# Include in a test class to get start/stop messages to standard out including suite and test timings
# messages will be written to stdout of the format
#
# SUITE ExploreControllerTest starting
# explore_controller_test.rb:72 test_should_handle_invalid_study_id starting
# explore_controller_test.rb:72 test_should_handle_invalid_study_id completed (0.925 sec)
# .explore_controller_test.rb:78 test_should_enforce_view_privileges starting
# explore_controller_test.rb:78 test_should_enforce_view_privileges completed (2.249 sec)
# .SUITE ExploreControllerTest completed (14.294 sec)

module TestInstrumentor
  include Minitest::Hooks

  around do |&test_block|
    method_source = self.class.instance_method(self.method_name).source_location
    filename = File.basename(method_source[0])
    puts "#{filename}:#{method_source[1]} #{self.method_name} starting"
    bench = Benchmark.measure { super(&test_block) }
    puts "#{filename}:#{method_source[1]} #{self.method_name} completed (#{bench.real.round(3)} sec)"
  end

  around(:all) do |&test_suite|
    puts "SUITE #{self.class} starting"
    bench = Benchmark.measure { super(&test_suite) }
    puts "SUITE #{self.class} completed (#{bench.real.round(3)} sec)"
  end
end
