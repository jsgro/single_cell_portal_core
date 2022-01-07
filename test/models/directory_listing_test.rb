require 'test_helper'

class DirectoryListingTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'directory listing test',
                                     test_array: @@studies_to_clean,
                                     user: @user)

    @file_list = []
    1.upto(20).each do |i|
      @file_list << {
        name: "sample_#{i}.bam",
        size: i * 100,
        generation: SecureRandom.random_number(10000..99999)
      }.with_indifferent_access
    end
    @directory_listing = DirectoryListing.create(study_id: @basic_study.id, file_type: 'bam',
                                                 name: '/', files: @file_list, sync_status: true)
  end

  ##
  # INSTANCE METHODS
  ##

  test 'should find file' do
    filename = @file_list.sample[:name]
    assert @directory_listing.has_file?(filename)
  end

  test 'should get total bytes' do
    expected_bytes = (100..2000).step(100).reduce(:+) # 21000, or 100 + 200 + ... + 2000
    assert_equal expected_bytes, @directory_listing.total_bytes
  end

  test 'should get bulk download folder name' do
    file = @file_list.sample
    expected_output = "root_dir/#{file[:name]}"
    assert_equal expected_output, @directory_listing.bulk_download_folder(file)
  end

  test 'should get bulk download pathname' do
    file = @file_list.sample
    expected_output = "#{@basic_study.accession}/root_dir/#{file[:name]}"
    assert_equal expected_output, @directory_listing.bulk_download_pathname(file)
  end

  ##
  # CLASS METHODS
  ##

  test 'should get base filename' do
    filename = @file_list.sample[:name]
    expected_basename = filename.split('.').first
    assert_equal expected_basename, DirectoryListing.file_basename(filename)
  end

  test 'should get folder name from file' do
    filepath = 'mouse/sample_1.bam'
    assert_equal 'mouse', DirectoryListing.get_folder_name(filepath)
    # test root directory
    new_path = filepath.split('/').last
    assert_equal '/', DirectoryListing.get_folder_name(new_path)
  end

  test 'should get file extension' do
    filename = @file_list.sample[:name]
    expected_extension = 'bam'
    assert_equal expected_extension, DirectoryListing.file_extension(filename)
    # test gz, tar support
    gzip_filename = 'sample_1.bam.gz'
    expected_extension = 'bam.gz'
    assert_equal expected_extension, DirectoryListing.file_extension(gzip_filename)
    tar_filename = 'sample_1.bam.tar.gz'
    expected_extension = 'bam.tar.gz'
    assert_equal expected_extension, DirectoryListing.file_extension(tar_filename)
  end

  test 'should get file type from extension' do
    filename = @file_list.sample[:name]
    expected_type = 'bam'
    assert_equal expected_type, DirectoryListing.file_type_from_extension(filename)
    # test index detection support
    index_filename = filename + '.bai'
    assert_equal expected_type, DirectoryListing.file_type_from_extension(index_filename)
    shortened_filename = 'sample_1.bai'
    assert_equal expected_type, DirectoryListing.file_type_from_extension(shortened_filename)
    # test tar, gz support
    compressed_filename = 'sample_1.bam.tar.gz'
    assert_equal expected_type, DirectoryListing.file_type_from_extension(compressed_filename)
    # fallback support
    archive_name = 'archive.zip'
    assert_equal 'zip', DirectoryListing.file_type_from_extension(archive_name)
  end

  # should create map of entries, ignoring txt & sequence file types
  test 'should create map of file extensions' do
    expected_map = {csv: {csv: 20}}.with_indifferent_access
    # create a mock file list to feed into create_extension_map
    # each entry must respond to the method :name, and be a filepath-like entry
    # that conforms to {extension}/sample_{num}.{extension}
    mock_file_list = []
    %w(csv txt bam bai).each do |ext|
      1.upto(20).each do |i|
        mock_file = Minitest::Mock.new
        mock_file.expect :name, "#{ext}/sample_#{i}.#{ext}"
        mock_file_list << mock_file
      end
    end
    output_map = DirectoryListing.create_extension_map(mock_file_list)
    assert_equal expected_map, output_map
  end
end
