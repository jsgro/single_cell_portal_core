# test_study_populator.rb
#
# adds example files to an already existing study in the test environment.  this differs from FactoryBot in that it is
# intended for regular, non-detached studies as it will push physical files to workspace buckets.  this also differs
# from SyntheticStudyPopulator in that it does not parse files
class TestStudyPopulator

  # normal example test files
  EXAMPLE_FILES = {
    expression: {
      name: 'expression_matrix_example.txt',
      path: 'test/test_data/expression_matrix_example.txt',
      file_type: 'Expression Matrix'
    },
    metadata: {
      name: 'metadata_example.txt',
      path: 'test/test_data/alexandria_convention/metadata.v2-0-0.txt',
      file_type: 'Metadata',
      use_metadata_convention: true
    },
    cluster: {
      name: 'cluster_example.txt',
      path: 'test/test_data/cluster_example.txt',
      file_type: 'Cluster'
    }
  }.with_indifferent_access.freeze

  FILE_TYPES = EXAMPLE_FILES.keys.freeze

  # add example files to an existing, non-detached study and push to workspace bucket
  def self.add_files(study, file_types: FILE_TYPES)
    raise ArgumentError, "#{study.accession} cannot be used as it is detached" if study.detached?

    puts "Invoking TestStudyPopulator on #{study.accession}"
    # select requested files/types, then create entries and push to workspace bucket
    EXAMPLE_FILES.select { |file_type, _| file_types.include? file_type }.values.each do |file_attributes|
      File.open(File.join(file_attributes[:path])) do |upload|
        file_attributes.delete(:path)
        file_attributes[:upload] = upload
        file_attributes[:study_id] = study.id
        print "Adding #{file_attributes[:name]} to #{study.accession}... "
        study_file = StudyFile.create!(file_attributes)
        puts "done, pushing file to bucket #{study.bucket_id}"
        study.send_to_firecloud(study_file)
      end
    end
    study.reload # refresh study state on return
  end
end
