require 'test_helper'

class CellMetadatumTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'CellMetadatum Test',
                               user: @user,
                               test_array: @@studies_to_clean)
    @metadata_file = FactoryBot.create(:metadata_file, name: 'metadata.txt', study: @study)
  end

  test 'should not visualize unique group annotations over 100' do
    # setup
    annotation_values = []
    300.times { annotation_values << SecureRandom.uuid }
    @cell_metadatum = CellMetadatum.new(name: 'Group Count Test', annotation_type: 'group', values: annotation_values)

    # assert unique group annotations > 100 cannot visualize
    can_visualize = @cell_metadatum.can_visualize?
    assert !can_visualize, "Should not be able to visualize group annotation with more that 100 unique values: #{can_visualize}"

    # check that numeric annotations are still fine
    @cell_metadatum.annotation_type = 'numeric'
    @cell_metadatum.values = []
    can_visualize = @cell_metadatum.can_visualize?
    assert can_visualize, "Should be able to visualize numeric annotations at any level: #{can_visualize}"
  end

  test 'should not visualize ontology id based annotations' do
    # setup
    @disease = CellMetadatum.create(study_id: @study.id, study_file_id: @metadata_file.id, name: 'disease',
                                    annotation_type: 'group', values: %w(MONDO_0000001))
    @disease_labels = CellMetadatum.create(study_id: @study.id, study_file_id: @metadata_file.id, name: 'disease__ontology_label',
                                           annotation_type: 'group', values: ['disease or disorder'])

    # ensure id-based annotations do not visualize
    assert @disease.is_ontology_ids?, "Did not correctly identify #{@disease.name} annotation as ontology ID based"
    assert_not @disease_labels.is_ontology_ids?,
               "Incorrectly labelled #{@disease_labels.name} annotation as ontology ID based"
    assert_not @disease.can_visualize?,
           "Should not be able to view #{@disease.name} annotation: values: #{@disease.values.size}, is_ontology_ids?: #{@disease.is_ontology_ids?}"
    assert_not @disease_labels.can_visualize?,
           "Should not be able to view #{@disease_labels.name} annotation: values: #{@disease_labels.values.size}, is_ontology_ids?: #{@disease_labels.is_ontology_ids?}"

    # update disease__ontology_label to have more than one value
    @disease_labels.values << 'tuberculosis'
    assert @disease_labels.can_visualize?,
           "Should be able to view #{@disease_labels.name} annotation: values: #{@disease_labels.values.size}, is_ontology_ids?: #{@disease_labels.is_ontology_ids?}"

    # clean up
    @disease.destroy
    @disease_labels.destroy
  end
end
