require 'simplecov'
SimpleCov.start 'rails'

if ENV['CI'] || ENV['CI'] == 'true'
  require 'codecov'
  SimpleCov.formatter = SimpleCov::Formatter::Codecov
end
