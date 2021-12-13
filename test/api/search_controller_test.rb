require 'api_test_helper'
require 'user_tokens_helper'
require 'bulk_download_helper'
require 'test_helper'

class SearchControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include ::TestInstrumentor

  HOMO_SAPIENS_FILTER = { id: 'NCBITaxon_9606', name: 'Homo sapiens' }
  NO_DISEASE_FILTER = { id: 'MONDO_0000001', name: 'disease or disorder' }

  # shorthand accessors
  FACET_DELIM = Api::V1::SearchController::FACET_DELIMITER
  FILTER_DELIM = Api::V1::SearchController::FILTER_DELIMITER

  setup do
    @user = User.find_by(email: 'testing.user.2@gmail.com')
    OmniAuth.config.mock_auth[:google_oauth2] = OmniAuth::AuthHash.new({
                                                                           :provider => 'google_oauth2',
                                                                           :uid => '123545',
                                                                           :email => 'testing.user@gmail.com'
                                                                       })
    sign_in @user
    @user.update_last_access_at!
    @random_seed = File.open(Rails.root.join('.random_seed')).read.strip

    @convention_accessions = StudyFile.where(file_type: 'Metadata', use_metadata_convention: true).map {|f| f.study.accession}.flatten
  end

  # reset known commonly used objects to initial states to prevent failures breaking other tests
  teardown do
    OmniAuth.config.mock_auth[:google_oauth2] = nil
    reset_user_tokens
    api_study = Study.find_by(name: /API/)
    api_study.update!(description: '', public: true)
  end

  after(:all) do
    BrandingGroup.destroy_all
  end

  test 'should get all search facets' do
    facet_count = SearchFacet.visible.count
    execute_http_request(:get, api_v1_search_facets_path)
    assert_response :success
    assert json.size == facet_count, "Did not find correct number of search facets, expected #{facet_count} but found #{json.size}"
  end

  test 'should get visible search facets' do
    # make one random facet not visible
    invisible_facet = SearchFacet.all.sample
    invisible_facet.update!(visible: false)
    visible_count = SearchFacet.visible.count
    execute_http_request(:get, api_v1_search_facets_path)
    assert_response :success
    assert json.size == visible_count,
           "Did not find correct number of visible search facets, expected #{visible_count} but found #{json.size}"
    assert visible_count == SearchFacet.count - 1,
           "Did not return correct direct count of visible facets; #{visible_count} != #{SearchFacet.count - 1}"
    invisible_facet.update!(visible: true)
  end

  test 'should get search facets for branding group' do
    branding_group = FactoryBot.create(:branding_group, user_list: [@user])
    facet_list = SearchFacet.pluck(:identifier).take(2).sort
    branding_group.update!(facet_list: facet_list)
    execute_http_request(:get, api_v1_search_facets_path(scpbr: branding_group.name_as_id))
    assert_response :success
    response_facets = json.map {|entry| entry['id']}.sort
    assert response_facets == facet_list,
           "Did not find correct facets for #{branding_group.name_as_id}, expected #{facet_list} but found #{response_facets}"
    branding_group.update!(facet_list: [])
  end

  test 'should search facet filters' do
    @search_facet = SearchFacet.first
    @search_facet.update_filter_values!
    filter = @search_facet.filters.first
    valid_query = filter[:name]
    execute_http_request(:get, api_v1_search_facet_filters_path(facet: @search_facet.identifier, query: valid_query))
    assert_response :success
    assert_equal json['query'], valid_query, "Did not search on correct value; expected #{valid_query} but found #{json['query']}"
    assert_equal json['filters'].first, filter, "Did not find expected filter of #{filter} in response: #{json['filters']}"
    invalid_query = 'does not exist'
    execute_http_request(:get, api_v1_search_facet_filters_path(facet: @search_facet.identifier, query: invalid_query))
    assert_response :success
    assert_equal json['query'], invalid_query, "Did not search on correct value; expected #{invalid_query} but found #{json['query']}"
    assert_equal json['filters'].size, 0, "Should have found no filters; expected 0 but found #{json['filters'].size}"
  end

  test 'should return viewable studies on empty search' do
    execute_http_request(:get, api_v1_search_path(type: 'study'))
    assert_response :success
    expected_studies = Study.viewable(@user).pluck(:accession).sort
    found_studies = json['matching_accessions'].sort
    assert_equal expected_studies, found_studies, "Did not return correct studies; expected #{expected_studies} but found #{found_studies}"

    sign_out @user
    execute_http_request(:get, api_v1_search_path(type: 'study'))
    assert_response :success
    expected_studies = Study.viewable(nil).pluck(:accession).sort
    public_studies = json['matching_accessions'].sort
    assert_equal expected_studies, public_studies, "Did not return correct studies; expected #{expected_studies} but found #{public_studies}"
  end

  test 'should return search results using facets' do
    study = Study.find_by(name: "Testing Study #{@random_seed}")
    other_matches = Study.viewable(@user).any_of({description: /#{HOMO_SAPIENS_FILTER[:name]}/},
                                 {description: /#{NO_DISEASE_FILTER[:name]}/}).pluck(:accession)
    # find all human studies from metadata
    facet_query = "species:#{HOMO_SAPIENS_FILTER[:id]}#{FACET_DELIM}disease:#{NO_DISEASE_FILTER[:id]}"
    execute_http_request(:get, api_v1_search_path(type: 'study', facets: facet_query))
    assert_response :success
    expected_accessions = (@convention_accessions + other_matches).uniq
    matching_accessions = json['matching_accessions']
    assert_equal expected_accessions, matching_accessions,
                 "Did not return correct array of matching accessions, expected #{expected_accessions} but found #{matching_accessions}"
    study_count = json['studies'].size
    assert_equal study_count, expected_accessions.size,
                 "Did not find correct number of studies, expected #{expected_accessions.size} but found #{study_count}"
    result_accession = json['studies'].first['accession']
    assert_equal result_accession, study.accession, "Did not find correct study; expected #{study.accession} but found #{result_accession}"
    matched_facets = json['studies'].first['facet_matches'].keys.sort
    matched_facets.delete_if {|facet| facet == 'facet_search_weight'} # remove search weight as it is not relevant

    source_facets = %w(disease species)
    assert_equal source_facets, matched_facets, "Did not match on correct facets; expected #{source_facets} but found #{matched_facets}"
  end

  test 'should return search results using numeric facets' do
    facet = SearchFacet.find_by(identifier: 'organism_age')
    facet.update_filter_values! # in case there is a race condition with parsing & facet updates
    # loop through 3 different units (days, months, years) to run a numeric-based facet query with conversion
    # days should return nothing, but months and years should match the testing study
    %w(days months years).each do |unit|
      facet_query = "#{facet.identifier}:#{facet.min + 1}#{FILTER_DELIM}#{facet.max - 1}#{FILTER_DELIM}#{unit}"
      execute_http_request(:get, api_v1_search_path(type: 'study', facets: facet_query))
      assert_response :success
      expected_accessions = unit == 'days' ? [] : @convention_accessions
      matching_accessions = json['matching_accessions']
      assert_equal expected_accessions, matching_accessions,
                   "Facet query: #{facet_query} returned incorrect matches; expected #{expected_accessions} but found #{matching_accessions}"
    end
  end

  test 'should return search results using keywords' do
    # test single keyword first
    execute_http_request(:get, api_v1_search_path(type: 'study', terms: @random_seed))
    assert_response :success
    expected_accessions = Study.viewable(@user).where(name: /#{@random_seed}/).pluck(:accession).sort
    matching_accessions = json['matching_accessions'].sort # need to sort results since they are returned in weighted order
    assert_equal expected_accessions, matching_accessions,
                 "Did not return correct array of matching accessions, expected #{expected_accessions} but found #{matching_accessions}"

    assert_equal @random_seed, json['studies'].first['term_matches'].first

    # test exact phrase
    search_phrase = "\"API Test Study\""
    execute_http_request(:get, api_v1_search_path(type: 'study', terms: search_phrase))
    assert_response :success
    quoted_accessions = Study.where(name: "API Test Study #{@random_seed}").pluck(:accession)
    found_accessions = json['matching_accessions'] # no need to sort as there should only be one result
    assert_equal quoted_accessions, found_accessions,
                 "Did not return correct array of matching accessions, expected #{quoted_accessions} but found #{found_accessions}"

    assert_equal search_phrase.gsub(/\"/, ''), json['studies'].first['term_matches'].first

    # test combination
    search_phrase += " testing"
    execute_http_request(:get, api_v1_search_path(type: 'study', terms: search_phrase))
    assert_response :success
    mixed_accessions = Study.any_of({name: "API Test Study #{@random_seed}"},
                                       {name: /testing/i}).pluck(:accession).sort
    found_mixed_accessions = json['matching_accessions'].sort
    assert_equal mixed_accessions, found_mixed_accessions,
                 "Did not return correct array of matching accessions, expected #{found_mixed_accessions} but found #{mixed_accessions}"
    assert_equal "testing", json['studies'].first['term_matches'].first
    assert_equal "API Test Study", json['studies'].last['term_matches'].first

    # test regex escaping
    execute_http_request(:get, api_v1_search_path(type: 'study', terms: 'foobar scp-105 [('))
    assert_response :success
  end

  test 'should return search results using accessions' do
    # test single accession
    term = Study.where(public: true).first.accession
    execute_http_request(:get, api_v1_search_path(type: 'study', terms: term))
    assert_response :success
    expected_accessions = [term]
    assert_equal expected_accessions, json['matching_accessions'],
                 "Did not return correct array of matching accessions, expected #{expected_accessions} but found #{json['matching_accessions']}"
  end

  test 'should filter search results by branding group' do
    # add study to branding group and search - should get 1 result
    study = Study.find_by(name: "Testing Study #{@random_seed}")
    branding_group = FactoryBot.create(:branding_group, user_list: [@user])
    study.update(branding_group_ids: [branding_group.id])

    query_parameters = {type: 'study', terms: @random_seed, scpbr: branding_group.name_as_id}
    execute_http_request(:get, api_v1_search_path(query_parameters))
    assert_response :success
    result_count = json['studies'].size
    assert_equal 1, result_count, "Did not find correct number of studies, expected 1 but found #{result_count}"
    found_study = json['studies'].first
    assert found_study['study_url'].include?("scpbr=#{branding_group.name_as_id}"),
           "Did not append branding group identifier to end of study URL: #{found_study['study_url']}"

    # remove study from group and search again - should get 0 results
    study.update(branding_group_ids: [])
    execute_http_request(:get, api_v1_search_path(query_parameters))
    assert_response :success
    assert_empty json['studies'], "Did not find correct number of studies, expected 0 but found #{json['studies'].size}"
  end

  test 'should run inferred search using facets' do
    other_study = Study.find_by(name: "API Test Study #{@random_seed}")
    original_description = other_study.description.to_s.dup
    other_study.update(description: '')
    facet_query = "species:#{HOMO_SAPIENS_FILTER[:id]}"
    execute_http_request(:get, api_v1_search_path(type: 'study', facets: facet_query))
    assert_response :success
    expected_accessions = @convention_accessions
    assert_equal expected_accessions, json['matching_accessions'],
                 "Did not find expected accessions before inferred search, expected #{expected_accessions} but found #{json['matching_accessions']}"

    # now update non-convention study to include a filter display value in its description
    # this should be picked up by the "inferred" search
    other_study.update(description: HOMO_SAPIENS_FILTER[:name])
    execute_http_request(:get, api_v1_search_path(type: 'study', facets: facet_query))
    assert_response :success
    inferred_accessions = expected_accessions + [other_study.accession]
    assert_equal inferred_accessions, json['matching_accessions'],
                 "Did not find expected accessions after inferred search, expected #{inferred_accessions} but found #{json['matching_accessions']}"
    inferred_study = json['studies'].last # inferred matches should be at the end
    assert inferred_study['inferred_match'],
           "Did not mark last search results as inferred_match: #{inferred_study['inferred_match']} != true"

    # reset description so other tests aren't broken
    other_study.update(description: original_description)
  end

  test 'should run inferred search using facets and phrase' do
    other_study = Study.find_by(name: "API Test Study #{@random_seed}")
    original_description = other_study.description.to_s.dup
    facet_query = "species:#{HOMO_SAPIENS_FILTER[:id]}"
    other_study.update(description: HOMO_SAPIENS_FILTER[:name])
    search_phrase = "Study #{@random_seed}"
    expected_accessions = (@convention_accessions + [other_study.accession]).uniq
    execute_http_request(:get, api_v1_search_path(type: 'study', facets: facet_query, terms: "\"#{search_phrase}\""))
    assert_response :success
    found_accessions = json['matching_accessions']
    assert_equal expected_accessions, found_accessions,
                 "Did not find expected accessions for phrase & facet search, expected #{expected_accessions} but found #{found_accessions}"
    # the combination of phrase + facet search is an AND, so 'API Test Study' will still be inferred as it does not
    # meet both search criteria
    non_inferred_study = json['studies'].first
    inferred_study = json['studies'].last
    assert_not non_inferred_study['inferred_match'],
               "First search result #{non_inferred_study['accession']} incorrectly marked as inferred"
    assert inferred_study['inferred_match'],
           "Last search result #{inferred_study['accession']} was not marked inferred"
    json['studies'].each do |study|
      assert_includes study['term_matches'], search_phrase,
                      "Did not find #{search_phrase} in term_matches for #{study['accession']}: #{study['term_matches']}"
    end
    # reset description so other tests aren't broken
    other_study.update(description: original_description)
  end

  test 'should find intersection of facets on inferred search' do
    # update other_study to match one filter from facets; should not be inferred since it doesn't meet both criteria
    other_study = Study.find_by(name: "API Test Study #{@random_seed}")
    original_description = other_study.description.to_s.dup
    facet_query = "species:#{HOMO_SAPIENS_FILTER[:id]}#{FACET_DELIM}disease:#{NO_DISEASE_FILTER[:id]}"
    other_study.update(description: HOMO_SAPIENS_FILTER[:name])
    execute_http_request(:get, api_v1_search_path(type: 'study', facets: facet_query))
    assert_response :success
    assert_equal @convention_accessions, json['matching_accessions'],
                 "Did not find expected accessions before inferred search, expected #{@convention_accessions} but found #{json['matching_accessions']}"

    # update to match both filters; should be inferred
    double_facet_name = "#{HOMO_SAPIENS_FILTER[:name]} #{NO_DISEASE_FILTER[:name]}"
    other_study.update(description: double_facet_name)
    execute_http_request(:get, api_v1_search_path(type: 'study', facets: facet_query))
    assert_response :success
    inferred_accessions = @convention_accessions + [other_study.accession]
    assert_equal inferred_accessions, json['matching_accessions'],
                 "Did not find expected accessions after inferred search, expected #{inferred_accessions} but found #{json['matching_accessions']}"
    inferred_study = json['studies'].last
    assert inferred_study['inferred_match'], "Did not correctly mark #{other_study.accession} as inferred"
    other_study.update(description: original_description)
  end

  test 'should run preset search' do
    # run accession list only search
    @preset_search = PresetSearch.create!(name: 'Preset Search Test', accession_list: %w(SCP1))
    permitted_study = Study.first
    execute_http_request(:get, api_v1_search_path(type: 'study', preset_search: @preset_search.identifier))
    assert_response :success
    permitted_accessions = %w(SCP1)
    assert json['matching_accessions'] == permitted_accessions,
           "Did not return correct permitted studies for preset search; expected #{permitted_accessions} but found #{json['matching_accessions']}"
    found_preset = json['studies'].first
    assert found_preset['accession'] == permitted_study.accession
    assert found_preset['preset_match'], "Did not correctly mark permitted study as preset match; #{found_preset['preset_match']}"

    # update to use user-search terms as well, include all studies to widen search
    all_accessions = Study.pluck(:accession)
    @preset_search.update(accession_list: all_accessions)
    @preset_search.reload
    search_terms = "\"API Test Study\""
    execute_http_request(:get, api_v1_search_path(type: 'study', preset_search: @preset_search.identifier, terms: search_terms))
    assert_response :success
    api_test_study = Study.find_by(name: /API Test Study/)
    assert_equal 1, json['studies'].count, "Found wrong number of studies; should be 1 but found #{json['studies'].count}"
    expected_results = [api_test_study.accession]
    assert_equal expected_results, json['matching_accessions'],
                 "Found wrong study with keywords & preset search; expected #{expected_results} but found #{json['matching_accessions']}"
    found_study = json['studies'].first
    assert found_study['preset_match']
    assert_equal ['API Test Study'], found_study['term_matches'], "Did not correctly match on #{search_terms}: #{found_study['term_matches']}"
    @preset_search.destroy # clean up
  end

  test 'should log out user after inactivity' do
    @user = User.first
    # save access token to prevent breaking downstream tests
    valid_token = @user.api_access_token.dup
    # mark study as false to show if a user is signed in or not
    api_test_study = Study.find_by(name: /API Test Study/)
    api_test_study.update(public: false)
    search_terms = "\"API Test Study\""
    execute_http_request(:get, api_v1_search_path(type: 'study', terms: search_terms))
    assert_response :success
    expected_results = [api_test_study.accession]
    assert_equal expected_results, json['matching_accessions'],
                 "Found wrong study with keywords search; expected #{expected_results} but found #{json['matching_accessions']}"
    # now simulate a user "timing out" by back-dating last_access_at timestamp by double the timeout threshold
    # and then re-run search
    last_access = @user.api_access_token[:last_access_at]
    timed_out_stamp = last_access - User.timeout_in * 2
    @user.api_access_token[:last_access_at] = timed_out_stamp
    @user.save
    execute_http_request(:get, api_v1_search_path(type: 'study', terms: search_terms))
    assert_response :success
    accessions = json['matching_accessions']
    assert_empty accessions, "Did not successfully time out session, accessions were found: #{accessions}"
    # clean up
    api_test_study.update(public: true)
    @user.update(api_access_token: valid_token)
  end

  test "should construct query elements for facets" do
    non_array_facet = {
      id: 'species',
      filters: [
        { id: 'NCBITaxon_9606', name: 'Homo sapiens' },
        { id: 'Gallus gallus', name: 'Gallus gallus' }
      ],
      db_facet: SearchFacet.find_by(identifier: 'species')
    }
    expected_where = "(species IN ('NCBITaxon_9606','Gallus gallus') OR" \
                     " species__ontology_label IN ('Homo sapiens','Gallus gallus'))"
    query_elements = Api::V1::SearchController.get_query_elements_for_facet(non_array_facet)
    assert_equal expected_where, query_elements[:where]
    array_facet = {
      id: 'disease',
      filters: [
        { id: 'MONDO_0005109', name: 'HIV infectious disease' },
        { id: 'Alzheimer disease', name: 'Alzheimer disease' }
      ],
      db_facet: SearchFacet.find_by(identifier: 'disease')
    }
    # assemble expected query elements
    # both disease and disease__ontology_label should have corresponding with/from/where clauses using UNNEST
    array_with = 'disease_filters AS (SELECT["MONDO_0005109", "Alzheimer disease"] as disease_value), ' \
                 'disease_label_filters AS (SELECT["HIV infectious disease", "Alzheimer disease"] ' \
                 'as disease_label_value)'
    array_from = 'disease_filters, UNNEST(disease_filters.disease_value) AS disease_val, disease_label_filters, ' \
                 'UNNEST(disease_label_filters.disease_label_value) AS disease_label_val'
    array_where = '((disease_val IN UNNEST(disease)) OR (disease_label_val IN UNNEST(disease__ontology_label)))'
    array_select = 'disease_val, disease_label_val'
    array_query_elements = Api::V1::SearchController.get_query_elements_for_facet(array_facet)
    assert_equal array_with, array_query_elements[:with]
    assert_equal array_from, array_query_elements[:from]
    assert_equal array_where, array_query_elements[:where]
    assert_equal array_select, array_query_elements[:select]
  end
end
