# search methods specific to Human Cell Atlas Azul service
class AzulSearchService
  # map of bulk download file types to extensions (for grouping in bulk download modal)
  # tar archives are lumped in with analysis_file entries as they could be either
  FILE_EXT_BY_DOWNLOAD_TYPE = {
    'sequence_file' => %w[bam bai fastq].map { |e| [e, e + '.gz'] }.flatten,
    'analysis_file' => %w[loom csv tsv txt mtx Rdata tar].map { |e| [e, e + '.gz'] }.flatten
  }.freeze

  # list of keys for an individual result entry used for matching facet filter values
  # each Azul result entry under 'hits' will have these keys, whether project- or file-based
  RESULT_FACET_FIELDS = %w[samples specimens cellLines donorOrganisms organoids cellSuspensions].freeze

  def self.append_results_to_studies(existing_studies, selected_facets:, terms:, facet_map: {})
    azul_results = ::AzulSearchService.get_results(selected_facets: selected_facets)
    Rails.logger.info "Found #{azul_results.keys.size} results in Azul"
    azul_results.each do |accession, azul_result|
      existing_studies << azul_result
      facet_map[accession] = azul_result[:facet_matches]
    end
    [existing_studies, facet_map]
  end

  # execute a search against Azul API
  # TODO: add support for keyword search (SCP-3806)
  def self.get_results(selected_facets:)
    client = ApplicationController.hca_azul_client
    results = {}
    query_json = client.format_query_from_facets(selected_facets)
    Rails.logger.info "Executing Azul project query with: #{query_json}"
    project_results = client.projects(query: query_json)
    project_ids = []
    project_results['hits'].each do |entry|
      entry_hash = entry.with_indifferent_access
      project_hash = entry_hash[:projects].first # there will only ever be one project here
      short_name = project_hash[:projectShortname]
      project_id = project_hash[:projectId]
      project_ids << project_id
      result = {
        hca_result: true,
        accession: short_name,
        name: project_hash[:projectTitle],
        description: project_hash[:projectDescription],
        hca_project_id: project_id,
        facet_matches: {},
        term_matches: [],
        file_information: [
          {
            url: project_id,
            file_type: 'Project Manifest',
            upload_file_size: 1.megabyte, # placeholder filesize as we don't know until manifest is downloaded
            name: "#{short_name}.tsv"
          }
        ]
      }.with_indifferent_access
      # get facet matches from rest of entry
      result[:facet_matches] = get_facet_matches(entry_hash, selected_facets)
      results[short_name] = result
    end
    # now run file query to get matching files for all matching projects
    file_query = { 'projectId' => { 'is' => project_ids } }
    Rails.logger.info "Executing Azul file query for projects: #{project_ids}"
    files = client.files(query: file_query)
    files.each do |file_entry|
      file_info = extract_azul_file_info(file_entry)
      accession = file_info[:accession]
      results[accession][:file_information] << file_info
    end
    results
  end

  # iterate through the result entries for each project to determine what facets/filters were matched
  def self.get_facet_matches(result, facets)
    results_info = {}
    facets.each do |facet|
      facet_name = facet[:id]
      RESULT_FACET_FIELDS.each do |result_field|
        azul_name = FacetNameConverter.convert_schema_column(:alexandria, :azul, facet_name)
        field_entries = result[result_field].map { |entry| entry[azul_name] }.flatten.uniq
        facet[:filters].each do |filter|
          match = field_entries.select { |entry| filter[:name] == entry || filter[:id] == entry }
          results_info[facet_name] ||= []
          if match.any? && !results_info[facet_name].include?(filter)
            results_info[facet_name] << filter
          end
        end
      end
    end
    # compute weight based off of number of filter hits
    results_info[:facet_search_weight] = results_info.values.map(&:count).flatten.reduce(0, :+)
    results_info
  end

  # extract Azul file information for bulk download from file entry object
  def self.extract_azul_file_info(file)
    file_info = {
      'name' => file['name'],
      'upload_file_size' => file['size'],
      'file_format' => file['format'],
      'url' => file['url'],
      'accession' => file['projectShortname'],
      'project_id' => file['projectId']
    }
    content = file['contentDescription']
    case content
    when /Matrix/
      file_info['file_type'] = 'analysis_file'
    when /Sequence/
      file_info['file_type'] = 'sequence_file'
    else
      # fallback to guess file_type by extension
      FILE_EXT_BY_DOWNLOAD_TYPE.each_pair do |file_type, extensions|
        if extensions.include? file['format']
          file_info['file_type'] = file_type
        end
      end
    end
    file_info.with_indifferent_access
  end


  # retrieve all possible facet/filter values present in Azul
  # this is done by executing an empty search and requesting only 1 project, then retrieving the
  # "termFacets" information from the response
  def self.get_all_facet_filters
    client = ApplicationController.hca_azul_client
    raw_facets = client.projects(query: {}, size: 1)['termFacets']
    mappable_facets = raw_facets.select { |facet, _| FacetNameConverter.schema_has_column?(:azul, :alexandria, facet) }
    mappable_facets.map do |facet_name, terms_hash|
      converted_name = FacetNameConverter.convert_schema_column(:azul, :alexandria, facet_name)
      all_terms = terms_hash['terms'].select { |t| t['term'].present? }
      if converted_name == 'organism_age'
        # special handling for age facet, get min/max info, but only for "years", as we normalize to that
        unit = 'year'
        unit_entries = all_terms.select { |term| term.dig('term', 'unit') == unit }
        min, max = unit_entries.map { |term| term.dig('term', 'value').to_f }.flatten.minmax
        { converted_name => { min: min, max: max, unit: 'years', is_numeric: true } }
      else
        { converted_name => { filters: all_terms.map { |t| t['term'] }, is_numeric: false } }
      end
    end.reduce({}, :merge).with_indifferent_access
  end
end
