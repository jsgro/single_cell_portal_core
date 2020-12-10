require "integration_test_helper"

class DownloadAgreementTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @random_seed = File.open(Rails.root.join('.random_seed')).read.strip
    @test_user = User.find_by(email: 'testing.user@gmail.com')
    @study = Study.create(name: "Download Agreement #{@random_seed}", user_id: @test_user.id, firecloud_project: ENV['PORTAL_NAMESPACE'])
    upload = File.open(Rails.root.join('test', 'test_data', 'expression_matrix_example.txt'))
    @exp_matrix = @study.study_files.build(file_type: 'Expression Matrix', upload: upload)
    if Taxon.count > 0
      @exp_matrix.taxon_id = Taxon.first.id
    end
    @exp_matrix.save!
    @study.send_to_firecloud(@exp_matrix)
    upload.close
    auth_as_user(@test_user)
    sign_in @test_user
  end

  teardown do
    Study.find_by(name: "Download Agreement #{@random_seed}").destroy
  end

  test 'should enforce download agreement' do
    puts "#{File.basename(__FILE__)}: '#{self.method_name}'"

    # ensure normal download works
    get download_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: @exp_matrix.upload_file_name)
    # since this is an external redirect, we cannot call follow_redirect! but instead have to get the location header
    assert_response 302, "Did not initiate file download as expected; response code: #{response.code}"
    signed_url = response.headers['Location']
    assert signed_url.include?(@exp_matrix.upload_file_name), "Redirect url does not point at requested file"

    # test bulk download, first by generating and saving user totat.
    totat = @test_user.create_totat
    get download_bulk_files_path(accession: @study.accession, study_name: @study.url_safe_name,
                                 download_object: 'all', totat: totat[:totat])
    assert_response :success, "Did not get curl config for bulk download"

    # enable download agreement, assert 403
    download_agreement = DownloadAgreement.new(study_id: @study.id, content: 'This is the agreement content')
    download_agreement.save!

    get download_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: @exp_matrix.upload_file_name)
    assert_response :forbidden, "Did not correctly respond 403 when download agreement is in place: #{response.code}"
    totat = @test_user.create_totat
    get download_bulk_files_path(accession: @study.accession, study_name: @study.url_safe_name,
                                 download_object: 'all', totat: totat[:totat])
    assert_response :forbidden, "Did not correctly respond 403 for bulk download: #{response.code}"
    assert response.body.include?('Download agreement'), "Error response did not reference download agreement: #{response.body}"

    # accept agreement and validate downloads resume
    download_acceptance = DownloadAcceptance.new(email: @test_user.email, download_agreement: download_agreement)
    download_acceptance.save!

    get download_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: @exp_matrix.upload_file_name)
    assert_response 302, "Did not re-enable file download as expected; response code: #{response.code}"
    signed_url = response.headers['Location']
    assert signed_url.include?(@exp_matrix.upload_file_name), "Redirect url does not point at requested file"
    totat = @test_user.create_totat
    get download_bulk_files_path(accession: @study.accession, study_name: @study.url_safe_name,
                                 download_object: 'all', totat: totat[:totat])
    assert_response :success, "Did not get curl config for bulk download after accepting download agreement"

    # clean up
    download_agreement.destroy
    download_acceptance.destroy

    puts "#{File.basename(__FILE__)}: '#{self.method_name}' successful!"
  end

end
