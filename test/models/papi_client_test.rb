require 'test_helper'

class PapiClientTest < ActiveSupport::TestCase

  before(:all) do
    @client = ApplicationController.papi_client
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'Papi Client Test',
                               user: @user,
                               test_array: @@studies_to_clean)

    @expression_matrix = FactoryBot.create(:study_file, name: 'dense.txt', file_type: 'Expression Matrix', study: @study)

    @expression_matrix.build_expression_file_info(is_raw_counts: true, units: 'raw counts',
                                                  library_preparation_protocol: 'MARS-seq',
                                                  modality: 'Transcriptomic: unbiased',
                                                  biosample_input_type: 'Whole cell')
    @expression_matrix.save!
    @cluster_file = FactoryBot.create(:cluster_file,
                                      name: 'cluster.txt', study: @study,
                                      cell_input: {
                                        x: [1, 4, 6],
                                        y: [7, 5, 3],
                                        z: [2, 8, 9],
                                        cells: %w[A B C]
                                      },
                                      x_axis_label: 'PCA 1',
                                      y_axis_label: 'PCA 2',
                                      z_axis_label: 'PCA 3',
                                      cluster_type: '3d',
                                      annotation_input: [
                                        { name: 'Category', type: 'group', values: %w[bar bar baz] },
                                        { name: 'Intensity', type: 'numeric', values: [1.1, 2.2, 3.3] }
                                      ])
  end

  test 'should instantiate client and assign attributes' do
    client = PapiClient.new
    assert client.project.present?
    assert client.service_account_credentials.present?
    assert client.service.present?
  end

  test 'should get client issuer' do
    issuer = @client.issuer
    assert issuer.match(/gserviceaccount\.com$/)
  end

  test 'should list pipelines' do
    pipelines = @client.list_pipelines
    skip "could not find any pipelines" if !!pipelines&.operations&.empty?
    assert pipelines.present?
    assert pipelines.operations.any?
  end

  test 'should assemble pipeline parameters and submit job' do
    # we're not actually testing a submission here, as this is also covered in several other integration test suites
    # this is just testing the interface and ensuring we get to service.run_pipeline
    @client.service.stub :run_pipeline, true do
      submission = @client.run_pipeline(study_file: @expression_matrix, user: @user, action: :ingest_expression)
      assert submission
    end
  end

  test 'should get individual pipeline run' do
    pipelines = @client.list_pipelines
    skip "could not find any pipelines" if !!pipelines&.operations&.empty?
    pipeline = pipelines.operations.sample
    requested_pipeline = @client.get_pipeline(name: pipeline.name)
    assert_equal pipeline.name, requested_pipeline.name
    assert_equal pipeline.metadata.dig('pipeline', 'actions'), requested_pipeline.metadata.dig('pipeline','actions')
  end
end
