# library with search methods specific to Human Cell Atlas Azul service
class AzulSearchService
  # map of bulk download file types to extensions (for grouping in bulk download modal)
  # tar archives are lumped in with analysis_file entries as they could be either
  # TODO: add supplemental_file column to bulk download for .tar archives
  FILE_EXT_BY_DOWNLOAD_TYPE = {
    'sequence_file' => %w[bam bai fastq fastq].map { |e| [e, e + '.gz'] }.flatten,
    'analysis_file' => %w[loom csv tsv txt mtx Rdata tar].map { |e| [e, e + '.gz'] }.flatten
  }.freeze

  # execute a search against Azul API
  # TODO: implement workaround for lack of keyword-based search in Azul
  def self.get_azul_results(selected_facets:)
    client = ApplicationController.hca_azul_client
    results = {}
    query_json = client.format_query_from_facets(selected_facets)
    Rails.logger.info "Executing Azul project query with: #{query_json}"
    project_results = client.projects(query: query_json)
    project_ids = []
    project_results.each do |project|
      safe_project = project.with_indifferent_access
      short_name = safe_project[:projectShortname]
      project_id = safe_project[:projectId]
      project_ids << project_id
      result = {
        hca_result: true,
        accession: short_name,
        name: safe_project[:projectTitle],
        description: safe_project[:projectDescription],
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
      # get facet matches from matrices JSON blob
      matches = get_facet_match_from_matrices(safe_project[:matrices], selected_facets)
      results[:facet_matches] = matches
      matches.each do |match|
        result[:facet_matches] << match unless result[:facet_matches].include?(match)
      end
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

  # iterate through the matrices/contributorMatrices hash from Azul results to pull out matches based off of
  # a faceted search request
  def self.get_facet_match_from_matrices(matrices, facets)
    results_info = {}
    matrix_map = get_matrix_map(matrices)
    facets.each do |facet|
      facet_name = facet[:id]
      azul_results = matrix_map[facet_name]
      if azul_results
        matches = facet[:filters].select { |filter| azul_results.include? filter[:name] }
        results_info[facet_name] = matches if matches.any?
      end
    end
    # compute weight based off of number of filter hits
    results_info[:facet_search_weight] = results_info.values.map(&:count).flatten.reduce(0, :+)
    results_info
  end

  # iterate through the nested hash of Azul matrix results to build a Hash of facets to filters (converted names)
  def self.get_matrix_map(matrix_hash, map = {})
    if matrix_hash.is_a?(Hash)
      matrix_hash.each_pair do |key, hash|
        # only store result if this value is a column from the Azul schema
        if FacetNameConverter.schema_has_column?(:azul, :alexandria, key)
          converted_name = FacetNameConverter.convert_schema_column(:azul, :alexandria, key)
          map.merge!({ converted_name.to_s => hash.keys })
        end
        get_matrix_map(hash, map)
      end
    end
    map
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
end
