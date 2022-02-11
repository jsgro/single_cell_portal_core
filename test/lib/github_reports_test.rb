require 'test_helper'

class GithubReportsTest < ActiveSupport::TestCase

  before(:all) do
    puts 'setup'
  end

  test 'should fail on exception' do
    raise 'Crazy test error'
  end

  test 'should fail on assert failure' do
    assert_equal 1, 2
  end

  test 'should succeed on assert passing' do
    puts "output from the test itself"
    assert_equal 1, 1
  end
end
