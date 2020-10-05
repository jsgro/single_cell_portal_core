require "integration_test_helper"

class DownloadAgreementTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @random_seed = File.open(Rails.root.join('.random_seed')).read.strip
    @study = Study.find_by(name: "Test Study #{@random_seed}")
    @test_user = User.find_by(email: 'testing.user@gmail.com')
    auth_as_user(@test_user)
    sign_in @test_user
  end

  test 'should enforce download agreement' do
    puts "#{File.basename(__FILE__)}: '#{self.method_name}'"

    # ensure normal download works
    file = @study.study_files.sample
    get download_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: file.upload_file_name)
    # since this is an external redirect, we cannot call follow_redirect! but instead have to get the location header
    assert_response 302, "Did not initiate file download as expected; response code: #{response.code}"
    signed_url = response.headers['Location']
    assert signed_url.include?(file.upload_file_name), "Redirect url does not point at requested file"

    # enable download agreement, assert 403
    download_agreement = DownloadAgreement.new(study_id: @study.id, content: 'This is the agreement content')
    download_agreement.save!

    file = @study.study_files.sample
    get download_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: file.upload_file_name)
    assert_response :forbidden, "Did not correctly respond 403 when download agreement is in place: #{response.code}"

    # accept agreement and validate downloads resume
    download_acceptance = DownloadAcceptance.new(email: @test_user.email, download_agreement: download_agreement)
    download_acceptance.save!

    get download_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: file.upload_file_name)
    assert_response 302, "Did not re-enable file download as expected; response code: #{response.code}"
    signed_url = response.headers['Location']
    assert signed_url.include?(file.upload_file_name), "Redirect url does not point at requested file"

    # clean up
    download_agreement.destroy
    download_acceptance.destroy

    puts "#{File.basename(__FILE__)}: '#{self.method_name}' successful!"
  end

end
