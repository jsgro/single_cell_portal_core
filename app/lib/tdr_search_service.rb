# search methods specific to Terra Data Repo
class TdrSearchService
  # top-level method to execute search, get term/facet matches, and append results to list of studies
  def self.append_results_to_studies(existing_studies, selected_facets:, terms:, facet_map: {})
    return [existing_studies, studies_by_facet] unless ApplicationController.data_repo_client.api_available?

    tdr_results = get_results(selected_facets: selected_facets, terms: terms)
    if selected_facets.present?
      simple_tdr_results = simplify_tdr_facet_search_results(tdr_results)
      matched_tdr_studies = match_studies_by_facet(simple_tdr_results, selected_facets)
      facet_map.merge!(matched_tdr_studies)
    end
    Rails.logger.info "Found #{tdr_results.keys.size} results in Terra Data Repo"
    tdr_results.each do |_, tdr_result|
      existing_studies << tdr_result
    end
    [existing_studies, facet_map]
  end

  # execute a search in TDR and get back normalized results
  # will actually issue 2 search requests, first to extract unique project_ids that match the query,
  # and a second to retrieve all result rows for those projects
  # this is to address issues in sparsity of Elasticsearch index with regards to some data (like species, disease, etc)
  def self.get_results(selected_facets:, terms:)
    client = ApplicationController.data_repo_client
    results = {}
    begin
      if selected_facets.present?
        facet_json = client.generate_query_from_facets(selected_facets)
      end
      if terms.present?
        term_json = client.generate_query_from_keywords(terms)
      end
      # now we merge the two queries together to perform a single search request
      query_json = client.merge_query_json(facet_query: facet_json, term_query: term_json)
      Rails.logger.info "Executing TDR query with: #{query_json}"
      snapshot_ids = AdminConfiguration.get_tdr_snapshot_ids
      Rails.logger.info "Scoping TDR query to snapshots: #{snapshot_ids.join(', ')}" if snapshot_ids.present?
      # first request is to only retrieve project IDs, then the second is for actual row-level results
      projects = client.query_snapshot_indexes(query_json, snapshot_ids: snapshot_ids)['result']
      project_ids = projects.map { |row| row['project_id'] }.uniq.compact
      project_query = client.generate_query_for_projects(project_ids)
      raw_tdr_results = client.query_snapshot_indexes(project_query, snapshot_ids: snapshot_ids)
      added_file_ids = {}
      raw_tdr_results['result'].each do |result_row|
        results = process_tdr_result_row(result_row, results,
                                         selected_facets: selected_facets,
                                         terms: terms,
                                         added_file_ids: added_file_ids)
      end
    rescue RestClient::Exception => e
      Rails.Rails.logger.error "Error querying TDR: #{e.class.name} -- #{e.message}"
      ErrorTracker.report_exception(e, nil, selected_facets, { terms: terms })
    end
    results
  end

  # process an individual result row from TDR
  # added_file_ids is a hash to ensure the same file is not added multiple times -- this method will
  # handle adding to and checking it.
  def self.process_tdr_result_row(row, results, selected_facets:, terms:, added_file_ids:)
    # get column name mappings for assembling results
    short_name_field = FacetNameConverter.convert_schema_column(:alexandria, :tim, :accession)
    name_field = FacetNameConverter.convert_schema_column(:alexandria, :tim, :study_name)
    description_field = FacetNameConverter.convert_schema_column(:alexandria, :tim, :study_description)
    short_name = row[short_name_field]
    results[short_name] ||= {
      tdr_result: true, # identify this entry as coming from Data Repo
      accession: short_name,
      name: row[name_field],
      description: row[description_field],
      hca_project_id: row['project_id'],
      facet_matches: [],
      term_matches: [],
      file_information: [
        {
          url: row['project_id'],
          file_type: 'Project Manifest',
          upload_file_size: 1.megabyte, # placeholder filesize as we don't know until manifest is downloaded
          name: "#{short_name}.tsv"
        }
      ]
    }.with_indifferent_access
    result = results[short_name]
    # determine facet filter matches
    if selected_facets.present?
      selected_facets.each do |facet|
        matches = get_facet_match_for_tdr_result(facet, row)
        matches.each do |col_name, matched_val|
          entry = { col_name => matched_val }
          result[:facet_matches] << entry unless result[:facet_matches].include?(entry)
        end
      end
    end
    if terms.present?
      terms.each do |term|
        matches = get_term_match_for_tdr_result(term, row)
        matches.each do |col_name, _|
          entry = { col_name => term }
          result[:term_matches] << entry unless result[:term_matches].include?(entry)
        end
      end
    end
    # gather file information for sequence_file and analysis_file entries
    if row['output_type'] =~ TDR_FILE_OUTPUT_TYPE_MATCH
      file_info = extract_file_information(row)
      drs_id = file_info[:drs_id]
      unless added_file_ids[drs_id]
        result[:file_information] << file_info
        added_file_ids[drs_id] = true
      end
    end
    results
  end

  # determine facet matches for an individual result row from TDR
  def self.get_facet_match_for_tdr_result(facet, result_row)
    tdr_name = FacetNameConverter.convert_schema_column(:alexandria, :tim, facet[:id])
    if facet[:filters].is_a? Hash
      # this is a numeric facet, so convert to range for match
      # TODO: determine correct unit/datatype and convert (SCP-3829)
      filter_value = "#{facet.dig(:filters, :min).to_i}-#{facet.dig(:filters, :max).to_i}"
      matches = result_row.each_pair.select { |col, val| col == tdr_name && val == filter_value }
    else
      matches = []
      facet[:filters].each do |filter|
        matches << result_row.each_pair.select { |col, val| col == tdr_name && (val == filter[:name] || val == filter[:id]) }
                             .flatten
      end
    end
    matches.reject! { |key, value| key.blank? || value.blank? }
    matches
  end

  # determine term/keyword match for an individual result row from TDR
  def self.get_term_match_for_tdr_result(term, result_row)
    name_field = FacetNameConverter.convert_schema_column(:tim, :alexandria, :study_name)
    description_field = FacetNameConverter.convert_schema_column(:tim, :alexandria, :study_description)
    matches = []
    [name_field, description_field].each do |tdr_name|
      result_row.each_pair do |col, val|
        if col == tdr_name && val.include?(term)
          matches << [tdr_name, term]
        end
      end
    end
    matches
  end

  # Simplify TDR results to be mappable for the UI badges for faceted search
  def self.simplify_tdr_facet_search_results(query_results)
    tdr_results = []
    query_results.each_pair do |accession, result|
      facet_matches = result[:facet_matches]
      if facet_matches.present?
        simple_result = { study_accession: accession }
        facet_matches.each do |mapping|
          mapping.each do |key, val|
            facet_name = FacetNameConverter.convert_schema_column(:tim, :alexandria, key)
            simple_result[facet_name] = val
          end
        end
      end
      tdr_results << simple_result
    end
    tdr_results
  end

  # extract file information from row-level TDR results for sequence_file and analysis_file entries
  def self.extract_file_information(result_row)
    safe_entry = result_row.with_indifferent_access
    output_type = safe_entry[:output_type]
    case output_type
    when 'sequence_file'
      filename = safe_entry[:sequence_file_name]
      format_parts = filename.split('.')
      # make a guess at the file format, controlling for gzipped files
      # this is a fallback if file_type hasn't been set in the row
      file_format = format_parts.last == 'gz' ? format_parts.slice(-2) : format_parts.last
      {
        'name' => filename,
        'upload_file_size' => safe_entry[:sequence_file_size].to_i,
        'file_type' => output_type,
        'file_format' => safe_entry[:file_type] || file_format,
        'drs_id' => safe_entry[:output_id]
      }.with_indifferent_access
    when 'analysis_file'
      {
        'name' => safe_entry[:analysis_file_name],
        'upload_file_size' => safe_entry[:analysis_file_size].to_i,
        'file_type' => output_type,
        'file_format' => safe_entry[:analysis_format],
        'drs_id' => safe_entry[:drs_id]
      }.with_indifferent_access
    end
  end
end
