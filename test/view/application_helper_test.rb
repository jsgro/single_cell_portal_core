require "test_helper"

class AnalysisConfigurationTest < ActiveSupport::TestCase

  test 'route_spec_to_name generates names correctly' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    name_spec_pairs = [
      ['study-view', 'study/:accession/:study_name'],
      ['study-view', '/single_cell/study/:accession/:study_name'],
      ['study-view-edit-study-description', 'study/:accession/:study_name/edit_study_description'],
      ['study-view-submissions-view-outputs', 'study/:accession/:study_name/submissions/:submission_id/outputs']
      ['root', '/'],
      ['root', '/single_cell']
    ]

    name_spec_pairs.each do |pair|

    assert_equal pair[0], ApplicationHelper.route_spec_to_name(pair[1])
    assert_equal 'study-view',
                  ApplicationHelper.route_spec_to_name()

    assert_equal
                 ApplicationHelper.route_spec_to_name()

    assert
    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'can extract required inputs from configuration' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    remote_config = @analysis_configuration.methods_repo_settings
    inputs = @analysis_configuration.required_inputs
    assert remote_config['inputs'] == inputs, "required inputs do not match; diff: #{compare_hashes(remote_config['inputs'], inputs)}"

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'can extract required outputs from configuration' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    remote_config = @analysis_configuration.methods_repo_settings
    outputs = @analysis_configuration.required_outputs
    assert remote_config['outputs'] == outputs, "required inputs do not match; diff: #{compare_hashes(remote_config['outputs'], outputs)}"

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
