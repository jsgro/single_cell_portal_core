# run_test_suite.rake
#
# custom rake test task to execute all unit/integration tests in single invocation
# allows for correct computation of coverage
#
# usage: rake test:run_test_suite

require 'rake/testtask'

namespace :test do
  Rake::TestTask.new(:run_test_suite) do |t|
    t.libs << "test"
    t.test_files = FileList['test/**/*_test.rb']
    t.warning = false
  end
end

