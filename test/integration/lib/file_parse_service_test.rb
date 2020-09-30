require "test_helper"

class FileParseServiceTest < ActiveSupport::TestCase

  # test detection & automatic creating of study_file_bundle objects based off of study_file.options params
  test 'should create study file bundle from parent' do
    puts "#{File.basename(__FILE__)}: '#{self.method_name}'"
    study = Study.first

    # test MTX bundling from parent
    test_data_basepath = Rails.root.join('test', 'test_data', 'GRCh38')
    matrix_filename = 'test_matrix.mtx'
    genes_filename = 'test_genes.tsv'
    barcodes_filename = 'barcodes.tsv'
    matrix_file = File.open(File.join(test_data_basepath, matrix_filename))
    genes_file = File.open(File.join(test_data_basepath, genes_filename))
    barcodes_file = File.open(File.join(test_data_basepath, barcodes_filename))
    # status: 'uploaded' is required for study_file_bundle to be marked as 'completed'
    matrix = study.study_files.build(file_type: 'MM Coordinate Matrix', upload: matrix_file, name: matrix_filename,
                                     status: 'uploaded')
    matrix.save!
    genes = study.study_files.build(file_type: '10X Genes File', upload: genes_file, name: genes_filename,
                                    options: {matrix_id: matrix.id.to_s}, status: 'uploaded')
    barcodes = study.study_files.build(file_type: '10X Barcodes File', upload: barcodes_file, name: barcodes_filename,
                                       options: {matrix_id: matrix.id.to_s}, status: 'uploaded')
    genes.save!
    barcodes.save!
    FileParseService.create_bundle_from_file_options(matrix, study)
    matrix.reload
    parent_bundle = matrix.study_file_bundle
    assert parent_bundle.present?, "Did not create study file bundle for matrix file"
    assert parent_bundle.parent == matrix, "Did not correctly mark matrix file as bundle parent"
    assert parent_bundle.completed?, "Did not correctly mark bundle as completed with all 3 files present"
    bundled_filenames = parent_bundle.bundled_files.pluck(:upload_file_name)
    [genes, barcodes].each do |bundle_file|
      bundle_file.reload
      filename = bundle_file.upload_file_name
      assert bundled_filenames.include?(filename), "Cannot find #{filename} in #{bundled_filenames}"
      assert bundle_file.study_file_bundle == parent_bundle,
             "Did not associate correct study file bundle object for #{filename}"
    end

    puts "#{File.basename(__FILE__)}: '#{self.method_name}' successful!"
  end

  test 'should create study file bundle from child' do
    # test cluster/labels bundling from child/bundled file
    puts "#{File.basename(__FILE__)}: '#{self.method_name}'"
    study = Study.first

    test_data_basepath = Rails.root.join('test', 'test_data')
    cluster_filename = 'cluster_example.txt'
    cluster_file = File.open(File.join(test_data_basepath, cluster_filename))
    cluster = study.study_files.build(file_type: 'Cluster', upload: cluster_file, name: cluster_filename,
                                      status: 'uploaded')
    cluster.save!
    coordinate_filename = 'coordinate_labels_1.txt'
    coordinate_file = File.open(File.join(test_data_basepath, coordinate_filename))
    coordinate_labels = study.study_files.build(file_type: 'Coordinate Labels', upload: coordinate_file,
                                                name: coordinate_filename, status: 'uploaded',
                                                options: {cluster_file_id: cluster.id.to_s})
    coordinate_labels.save!
    FileParseService.create_bundle_from_file_options(coordinate_labels, study)
    cluster.reload
    coordinate_labels.reload
    cluster_bundle = cluster.study_file_bundle
    assert cluster_bundle.present?, "Did not create study file bundle for cluster file w/ coordinate labels present"
    assert cluster_bundle.completed?, "Did not mark cluster bundle completed"
    assert cluster_bundle.bundled_files.first == coordinate_labels, "Did not correctly return labels file from bundle"

    puts "#{File.basename(__FILE__)}: '#{self.method_name}' successful!"
  end

  # TODO: once SCP-2765 is completed, test that all genes/values are parsed from mtx bundle
  # this will replace the deprecated 'should parse valid mtx bundle' from study_validation_test.rb
  test 'should store all genes and expression values from mtx parse' do
    assert true
  end

end
