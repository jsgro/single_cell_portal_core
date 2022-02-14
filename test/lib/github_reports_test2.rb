require 'test_helper'

class GithubReportsTest2 < ActiveSupport::TestCase

  before(:all) do
    puts 'setup'
  end

  test 'should fail on exception 2' do
    raise 'Crazy test error'
  end

  test 'should fail on assert failure 2 ' do
    assert_equal 1, 2
  end

  test 'should succeed on assert passing 2' do
    puts "output from the test itself"
    assert_equal 1, 1
  end
end
