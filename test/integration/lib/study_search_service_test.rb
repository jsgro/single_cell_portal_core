require 'test_helper'

class StudySearchServiceTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @metadata_study = FactoryBot.create(:detached_study,
                                        name_prefix: 'Study Search Service Test',
                                        public: true,
                                        user: @user,
                                        test_array: @@studies_to_clean)
    @metadata_file = FactoryBot.create(:metadata_file,
                                       name: 'metadata.txt',
                                       study: @metadata_study,
                                       annotation_input: [
                                         {
                                           name: 'cell_type',
                                           type: 'group',
                                           values: [
                                             'B cell', 'amacrine cell', 'retinal cone cell'
                                           ]
                                         }
                                       ])
    @name_study = FactoryBot.create(:detached_study,
                                    name_prefix: 'Cell Name Test',
                                    public: false,
                                    user: @user,
                                    test_array: @@studies_to_clean)
    @base_studies = Study.where(user: @user)
    @filters = [
      { id: 'CL_0000236', name: 'B cell' },
      { id: 'CL_0000561', name: 'amacrine cell' },
      { id: 'CL_0000573', name: 'retinal cone cell' }
    ]
    @search_facet = SearchFacet.create(name: 'Cell type', identifier: 'cell_type',
                                       filters: @filters,
                                       public_filters: @filters,
                                       ontology_urls: [
                                         {
                                           name: 'Cell Ontology',
                                           url: 'https://www.ebi.ac.uk/ols/api/ontologies/cl',
                                           browser_url: 'https://www.ebi.ac.uk/ols/ontologies/cl'
                                         }
                                       ],
                                       data_type: 'string', is_ontology_based: true, is_array_based: false,
                                       big_query_id_column: 'cell_type',
                                       big_query_name_column: 'cell_type__ontology_label',
                                       convention_name: 'Alexandria Metadata Convention', convention_version: '2.2.0')
  end

  test 'should find studies by converting keyword search' do
    matched_studies = StudySearchService.get_studies_from_term_conversion(['cell'])
    assert matched_studies[@metadata_study.accession].present?
    assert_equal (@filters.map { |f| f[:name] }),
                 (matched_studies[@metadata_study.accession][:cell_type].map { |f| f[:name] })
  end

  test 'should match facet filters from terms' do
    cell_matches = StudySearchService.match_facet_filters_from_terms(%w[cell])
    expected_match = { cell_type: @filters.map { |f| f[:name] } }.with_indifferent_access
    assert_equal expected_match, cell_matches
    amacrine_match = StudySearchService.match_facet_filters_from_terms(%w[amacrine])
    expected_match = { cell_type: ['amacrine cell'] }.with_indifferent_access
    assert_equal expected_match, amacrine_match
    empty_match = StudySearchService.match_facet_filters_from_terms(%w[foo])
    assert_empty empty_match
  end

  test 'should escape terms via regexp' do
    terms = %w[foo bar baz]
    normal_terms = /(foo|bar|baz)/i
    assert_equal normal_terms, StudySearchService.escape_terms_for_regex(term_list: terms)
    quoted_terms = /(this\ is\ a\ whole\ phrase|foo|bar)/i
    assert_equal quoted_terms, StudySearchService.escape_terms_for_regex(term_list: ['this is a whole phrase', 'foo', 'bar'])
    terms_with_escapes = %w[foo foo$ foo. foo/]
    expected_escapes = /(foo|foo\$|foo\.|foo\/)/i
    assert_equal expected_escapes, StudySearchService.escape_terms_for_regex(term_list: terms_with_escapes)
  end
end
