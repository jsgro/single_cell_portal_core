module Api
  module V1
    class SearchController < ApiBaseController
      include Concerns::Authenticator
      include Swagger::Blocks
      include StudySearchResultsObjects

      before_action :set_current_api_user!
      before_action :authenticate_api_user!, only: [:create_auth_code]
      before_action :set_search_facet, only: :facet_filters
      before_action :set_search_facets_and_filters, only: :index
      before_action :set_preset_search, only: :index
      before_action :set_branding_group, only: [:index, :facets]

      swagger_path '/search' do
        operation :get do
          key :tags, [
              'Search'
          ]
          key :summary, 'Faceted & keyword search for studies & cells'
          key :description, 'Search studies or cells using facets and keywords.'
          key :operationId, 'search_studies'
          parameter do
            key :name, :type
            key :in, :query
            key :description, 'Type of query to perform (study- or cell-based)'
            key :required, true
            key :type, :string
            key :enum, ['study', 'cell']
          end
          parameter do
            key :name, :facets
            key :in, :query
            key :description, 'User-supplied list facets and filters, formatted as: "facet_id:filter_value+facet_id_2:filter_value_2,filter_value_3"'
            key :required, false
            key :type, :string
          end
          parameter do
            key :name, :terms
            key :in, :query
            key :description, 'User-supplied query string'
            key :required, false
            key :type, :string
          end
          parameter do
            key :name, :genes
            key :in, :query
            key :description, 'space-delimited list of genes.  e.g. "agpat2 farsa"'
            key :required, false
            key :type, :string
          end
          parameter do
            key :name, :preset_search
            key :in, :query
            key :description, 'Identifier of preset/stored query'
            key :required, false
            key :type, :string
          end
          parameter do
            key :name, :page
            key :in, :query
            key :description, 'Page number for pagination control'
            key :required, false
            key :type, :integer
          end
          parameter do
            key :name, :scpbr
            key :in, :query
            key :description, 'Requested branding group (to filter results on)'
            key :reqired, false
            key :type, :string
          end
          parameter do
            key :name, :order
            key :in, :query
            key :description, 'Requested order of results'
            key :reqired, false
            key :type, :string
            key :enum, [:recent, :popular]
          end
          response 200 do
            key :description, 'Search parameters, Studies and StudyFiles'
            schema do
              key :title, 'Search Results'
              property :type do
                key :type, :string
                key :description, 'Type of search performed'
              end
              property :terms do
                key :type, :string
                key :title, 'Keywords used in search'
              end
              property :current_page do
                key :type, :integer
                key :title, 'Current page of paginated studies'
              end
              property :total_pages do
                key :type, :integer
                key :title, 'Total number of pages of studies'
              end
              property :total_studies do
                key :type, :integer
                key :title, 'Total number of studies matching search'
              end
              property :scpbr do
                key :type, :string
                key :description, 'Requested branding group id'
              end
              property :matching_accessions do
                key :type, :array
                key :description, 'Array of study accessions matching query'
                items do
                  key :type, :string
                end
              end
              property :facets do
                key :type, :array
                key :title, 'SearchFacets'
                key :description, 'Array of facets/filters used in search'
                items do
                  key :type, :object
                  key :title, 'SearchFacet'
                  property :id do
                    key :type, :string
                    key :description, 'ID of facet'
                  end
                  property :filters do
                    key :type, :array
                    key :description, 'Matching filters'
                    items do
                      key :type, :object
                      key :title, 'Filter'
                      property :name do
                        key :type, :string
                        key :description, 'Display value of filter'
                      end
                      property :id do
                        key :type, :string
                        key :description, 'ID value of filter'
                      end
                    end
                  end
                end
              end
              property :studies do
                key :type, :array
                items do
                  key :title, 'Study, StudyFiles'
                  key :'$ref', :SearchStudyWithFiles
                end
              end
            end
          end
          response 406 do
            key :description, ApiBaseController.not_acceptable
          end
          response 500 do
            key :description, 'Server error'
          end
        end
      end

      def index
        @viewable = Study.viewable(current_api_user)

        # filter results by branding group, if specified
        if @selected_branding_group.present?
          @viewable = @viewable.where(branding_group_id: @selected_branding_group.id)
        end
        # variable for determining how we will sort search results for relevance
        sort_type = :none

        # if a user requested a preset search, override search parameters to load the requested query
        if @preset_search.present?
          params[:terms] = "#{@preset_search.keyword_query_string} #{params[:terms]}".strip
          @facets = @preset_search.matching_facets_and_filters if @preset_search.search_facets.any?
          # if accession list is provided, scope viewable to only those studies
          if @preset_search.accession_list.any?
            sort_type = :accession_list if params[:terms].blank?
            @accession_list = @preset_search.accession_list
            logger.info "Scoping search results to accessions from preset search: #{@preset_search.name}: #{@accession_list}"
            @viewable = @viewable.where(:accession.in => @accession_list)
          end
        end

        # if search params are present, filter accordingly
        if params[:terms].present?
          sort_type = :keyword
          @search_terms = RequestUtils.sanitize_search_terms params[:terms]
          # determine if search values contain possible study accessions
          possible_accessions = StudyAccession.sanitize_accessions(@search_terms.split)
          # determine query case based off of search terms (either :keyword or :phrase)
          if @search_terms.include?("\"")
            @term_list = self.class.extract_phrases_from_search(query_string: @search_terms)
            logger.info "Performing phrase-based search using #{@term_list}"
            @studies = self.class.generate_mongo_query_by_context(terms: @term_list, base_studies: @viewable,
                                                                  accessions: possible_accessions, query_context: :phrase)
            logger.info "Found #{@studies.count} studies in phrase search: #{@studies.pluck(:accession)}"
          else
            @term_list = @search_terms.split
            logger.info "Performing keyword-based search using #{@term_list}"
            @studies = self.class.generate_mongo_query_by_context(terms: @search_terms, base_studies: @viewable,
                                                                  accessions: possible_accessions, query_context: :keyword)
            logger.info "Found #{@studies.count} studies in keyword search: #{@studies.pluck(:accession)}"

          end
          # all of our terms were accessions, so this is a "cached" query, and we want to return
          # results in the exact order specified in the accessions array
          if possible_accessions.size == @term_list.size
            sort_type = :accession
          end
        else
          @studies = @viewable
        end

        # only call BigQuery if list of possible studies is larger than 0 and we have matching facets to use
        if @studies.count > 0 && @facets.any?
          sort_type = :facet
          @studies_by_facet = {}
          @big_query_search = self.class.generate_bq_query_string(@facets)
          logger.info "Searching BigQuery using facet-based query: #{@big_query_search}"
          query_results = ApplicationController.big_query_client.dataset(CellMetadatum::BIGQUERY_DATASET).query @big_query_search
          job_id = query_results.job_gapi.job_reference.job_id
          # build up map of study matches by facet & filter value (for adding labels in UI)
          @studies_by_facet = self.class.match_studies_by_facet(query_results, @facets)
          # uniquify result list as one study may match multiple facets/filters
          @convention_accessions = query_results.map {|match| match[:study_accession]}.uniq
          logger.info "Found #{@convention_accessions.count} matching studies from BQ job #{job_id}: #{@convention_accessions}"
          @studies = @studies.where(:accession.in => @convention_accessions)
        end

        # filter the studies by genes if asked
        if params[:genes].present?
          @gene_results = StudySearchService.find_studies_by_gene_param(params[:genes], @studies.pluck(:id))
          @studies = @studies.where(:id.in => @gene_results[:study_ids])
        end

        # reset order if user requested a custom ordering
        if params[:order].present?
          sort_type = params[:order].to_sym
        end

        # determine sort order for pagination; minus sign (-) means a descending search
        @studies = @studies.to_a
        case sort_type
        when :keyword
          @studies = @studies.sort_by {|study| -study.search_weight(@term_list)[:total] }
        when :accession
          @studies = @studies.sort_by do |study|
            accession_index = possible_accessions.index(study.accession)
            if accession_index.nil?
              # study was not a true accession match, it matches the accession term in its description
              # make this appear after the proper accession matches, in order of weight match
              accession_index = 9999 - study.search_weight(@term_list)[:total]
            end
            accession_index
          end
        when :accession_list
          @studies = @studies.sort_by {|study| @accession_list.index(study.accession) }
        when :facet
          @studies = @studies.sort_by {|study| -@studies_by_facet[study.accession][:facet_search_weight]}
        when :recent
          @studies = @studies.sort_by(&:created_at).reverse
        when :popular
          @studies = @studies.sort_by(&:view_count).reverse
        else
          # we have sort_type of :none, so preserve original ordering of :view_order
          @studies = @studies.sort_by(&:view_order)
        end

        # save list of study accessions for bulk_download/bulk_download_size calls, in order of results
        @matching_accessions = @studies.map(&:accession)
        logger.info "Total matching accessions from all non-inferred searches: #{@matching_accessions}"

        # if a user ran a faceted search, attempt to infer results by converting filter display values to keywords
        # Do not run inferred search if we have a preset search with an accession list
        if @facets.any? && @accession_list.nil?
          # preserve existing search terms, if present
          facets_to_keywords = @term_list.present? ? {keywords: @term_list.dup} : {}
          facets_to_keywords.merge!(self.class.convert_filters_for_inferred_search(facets: @facets))
          # only run inferred search if we have extra keywords to run; numeric facets do not generate inferred searches
          if facets_to_keywords.any?
            @inferred_terms = facets_to_keywords.values.flatten
            logger.info "Running inferred search using #{facets_to_keywords}"
            inferred_studies = self.class.generate_mongo_query_by_context(terms: facets_to_keywords, base_studies: @viewable,
                                                                          accessions: @matching_accessions, query_context: :inferred)
            @inferred_accessions = inferred_studies.pluck(:accession)
            logger.info "Found #{@inferred_accessions.count} inferred matches: #{@inferred_accessions}"
            @matching_accessions += @inferred_accessions
            @studies += inferred_studies.sort_by {|study| -study.search_weight(@inferred_terms)[:total] }
          end
        end

        # perform TDR search, if enabled, and there are facets/terms provided by user
        if User.feature_flag_for_instance(current_api_user, 'cross_dataset_search_backend') && (@facets.present? || @term_list.present?)
          @tdr_results = self.class.get_tdr_results(selected_facets: @facets, terms: @term_list)

          if @facets.present?
            simple_tdr_results = self.class.simplify_tdr_facet_search_results(@tdr_results, @facets)
            matched_tdr_studies = self.class.match_studies_by_facet(simple_tdr_results, @facets)
            
            if @studies_by_facet.present?
              @studies_by_facet.merge!(matched_tdr_studies)
            else
              @studies_by_facet = matched_tdr_studies
            end
          end
          # just log for now
          logger.info "Found #{@tdr_results.keys.size} results in Terra Data Repo"
          logger.info pp @tdr_results if @tdr_results.any?
          @tdr_results.each do |short_name, tdr_result|
            @studies << tdr_result
          end
        end

        @matching_accessions = @studies.map {|study| study.is_a?(Study) ? study.accession : study[:accession]}
        logger.info "Final list of matching studies: #{@matching_accessions}"
        @results = @studies.paginate(page: params[:page], per_page: Study.per_page)
        render json: search_results_obj, status: 200
      end

      swagger_path '/search/facets' do
        operation :get do
          key :tags, [
              'Search'
          ]
          key :summary, 'Get all available facets'
          key :description, 'Returns a list of all available search facets, including filter values'
          key :operationId, 'search_facets_path'
          parameter do
            key :name, :scpbr
            key :in, :query
            key :description, 'Requested branding group (to filter facets on)'
            key :reqired, false
            key :type, :string
          end
          response 200 do
            key :description, 'Array of SearchFacets'
            schema do
              key :type, :array
              key :title, 'Array'
              items do
                key :title, 'SearchFacetConfig'
                key :'$ref', :SearchFacetConfig
              end
            end
          end
          response 406 do
            key :description, ApiBaseController.not_acceptable
          end
        end
      end

      def facets
        if @selected_branding_group.present?
          @search_facets = @selected_branding_group.facets
        else
          @search_facets = SearchFacet.visible
        end
      end

      swagger_path '/search/facet_filters' do
        operation :get do
          key :tags, [
              'Search'
          ]
          key :summary, 'Search matching filters for a facet'
          key :description, 'Returns a list of matching facet filters for a given facet'
          key :operationId, 'search_facet_filters_path'
          parameter do
            key :name, :facet
            key :in, :query
            key :description, 'Identifier of facet'
            key :required, true
            key :type, :string
          end
          parameter do
            key :name, :query
            key :in, :query
            key :description, 'User-supplied query string'
            key :required, true
            key :type, :string
          end
          response 200 do
            key :description, 'SearchFacet with matching filters'
            schema do
              key :title, 'SearchFacetQuery'
              key :'$ref', :SearchFacetQuery
            end
          end
          response 406 do
            key :description, ApiBaseController.not_acceptable
          end
          response 500 do
            key :description, 'Server error'
          end
        end
      end

      def facet_filters
        # sanitize query string for regexp matching
        @query_string = params[:query]
        query_matcher = /#{Regexp.escape(@query_string)}/i
        filter_list = user_signed_in? ? @search_facet.filters : @search_facet.public_filters
        @matching_filters = filter_list.select { |filter| filter[:name] =~ query_matcher }
      end

      private

      def set_branding_group
        @selected_branding_group = BrandingGroup.find_by(name_as_id: params[:scpbr])
      end

      def set_preset_search
        @preset_search = PresetSearch.find_by(identifier: params[:preset_search])
      end

      def set_search_facet
        @search_facet = SearchFacet.find_by(identifier: params[:facet])
      end

      def set_search_facets_and_filters
        @facets = []
        if params[:facets].present?
          facet_queries = RequestUtils.split_query_param_on_delim(parameter: params[:facets], delimiter: '+')
          facet_queries.each do |query|
            facet_id, raw_filters = RequestUtils.split_query_param_on_delim(parameter: query, delimiter: ':')
            filter_values = RequestUtils.split_query_param_on_delim(parameter: raw_filters)
            facet = SearchFacet.find_by(identifier: facet_id)
            if facet.present?
              matching_filters = self.class.find_matching_filters(facet: facet, filter_values: filter_values)
              if matching_filters.any?
                @facets << {
                    id: facet.identifier,
                    filters: matching_filters,
                    db_facet: facet # used for lookup later in :generate_bq_query_string
                }
              end
            end
          end
        end
      end

      # sanitize search values
      def sanitize_search_values(terms)
        if terms.is_a?(Array)
          sanitized = terms.map {|t| view_context.sanitize(t)}
          sanitized.join(',')
        else
          view_context.sanitize(terms)
        end
      end

      # extract any "quoted phrases" from query string and tokenize terms
      def self.extract_phrases_from_search(query_string:)
        terms = []
        query_string.split("\"").each do |substring|
          # when splitting on double quotes, phrases will not have any leading/trailing space
          # individual lists of terms will have one or the other, which is how we differentiate
          if substring.start_with?(' ') || substring.end_with?(' ')
            terms += substring.strip.split
          else
            terms << substring
          end
        end
        terms.delete_if(&:blank?) # there is usually one blank entry if we had a quoted phrase, so remove it
      end

      # escape regular expression control characters from list of search terms and format for search
      def self.escape_terms_for_regex(term_list:)
        escaped_terms = term_list.map {|term| Regexp.quote term}
        /(#{escaped_terms.join('|')})/i
      end

      # generate a Mongoid::Criteria object to perform a keyword/exact phrase search based on contextual use case
      # supports the following query_contexts: :keyword (individual terms), :phrase (quoted phrases & keywords)
      # and :inferred (converting a facet-based query to keywords)
      # will scope the query based off of :base_studies, and include/exclude studies matching
      # :accessions based on the :query_context (included by default, but excluded in :inferred to avoid duplicates)
      def self.generate_mongo_query_by_context(terms:, base_studies:, accessions:, query_context:)
        case query_context
        when :keyword
          base_studies.any_of({:$text => {:$search => terms}}, {:accession.in => accessions})
        when :phrase
          study_regex = escape_terms_for_regex(term_list: terms)
          base_studies.any_of({name: study_regex}, {description: study_regex}, {:accession.in => accessions})
        when :inferred
          # in order to maintain the same behavior as normal facets, we run each facet separately and get matching accessions
          # this gives us an array of arrays of matching accessions; now find the intersection (:&)
          filters = terms.values.map {|keywords| escape_terms_for_regex(term_list: keywords)}
          accessions_by_filter = filters.map {|filter| base_studies.any_of({name: filter}, {description: filter})
                                                           .where(:accession.nin => accessions).pluck(:accession)}
          base_studies.where(:accession.in => accessions_by_filter.inject(:&))
        else
          # no matching query case, so perform normal text-index search
          base_studies.any_of({:$text => {:$search => terms}}, {:accession.in => accessions})
        end
      end

      # generate query string for BQ
      # array-based columns need to set up data in WITH clauses to allow for a single UNNEST(column_name) call,
      # otherwise UNNEST() is called multiple times for each user-supplied filter value and could impact performance
      def self.generate_bq_query_string(facets)
        base_query = "SELECT DISTINCT study_accession"
        from_clause = " FROM #{CellMetadatum::BIGQUERY_TABLE}"
        where_clauses = []
        with_clauses = []
        or_facets = [['cell_type', 'cell_type__custom'], ['organ', 'organ_region']]
        leading_or_facets = or_facets.map(&:first)
        trailing_or_facets = or_facets.map(&:last)
        or_grouped_where_clause = nil
        # sort the facets so that OR'ed facets will be next to each other, the 99 is just
        # an arbitrary large-ish number to make sure the non-or-grouped facets are sorted together
        sorted_facets = facets.sort_by {|facet| or_facets.flatten.find_index(facet[:id]) || 99}
        sorted_facets.each_with_index do |facet_obj, index|
          query_elements = get_query_elements_for_facet(facet_obj)
          from_clause += ", #{query_elements[:from]}" if query_elements[:from]
          base_query += ", #{query_elements[:select]}" if query_elements[:select]
          with_clauses << query_elements[:with] if query_elements[:with]
          or_group_index = leading_or_facets.find_index(facet_obj[:id])
          next_facet_id = sorted_facets[index + 1].try(:[], :id)

          # this block handles 3 cases: (1) regular AND (2) leading OR (3) trailing OR
          if or_group_index && trailing_or_facets[or_group_index] == next_facet_id
             # we're at the start of a pair of facets that should be grouped by OR
             or_grouped_where_clause = "(#{query_elements[:where]} OR "
          else
            if or_grouped_where_clause
              # we're on the second of a pair of facets that should be grouped by OR
              where_clauses << or_grouped_where_clause + "#{query_elements[:where]})"
              or_grouped_where_clause = nil
            else
              # we're on a regular AND facet
              where_clauses << query_elements[:where]
            end
          end
        end
        # prepend WITH clauses before base_query (if needed), then add FROM and dependent WHERE clauses
        # all facets are treated as AND clauses
        with_statement = with_clauses.any? ? "WITH #{with_clauses.join(", ")} " : ""
        with_statement + base_query + from_clause + " WHERE " + where_clauses.join(" AND ")
      end

      def self.get_query_elements_for_facet(facet_obj)
        query_elements = {
          where: nil,
          with: nil,
          from: nil,
          select: nil,
          display_where: nil
        }
        # get the facet instance in order to run query
        search_facet = facet_obj[:db_facet]
        column_name = search_facet.big_query_id_column
        if search_facet.is_array_based?
          # if facet is array-based, we need to format an array of filter values selected by user
          # and add this as a WITH clause, then add two UNNEST() calls for both the BQ array column
          # and the user filters to optimize the query
          # example query:
          # WITH disease_filters AS (SELECT['MONDO_0000001', 'MONDO_0006052'] as disease_value)
          # FROM cell_metadata.alexandria_convention, disease_filters, UNNEST(disease_filters.disease_value) AS disease_val
          # WHERE (disease_val IN UNNEST(disease))
          facet_id = search_facet.identifier
          filter_arr_name = "#{facet_id}_filters"
          filter_val_name = "#{facet_id}_value"
          filter_where_val = "#{facet_id}_val"
          filter_values = facet_obj[:filters].map {|filter| filter[:id]}
          query_elements[:with] = "#{filter_arr_name} AS (SELECT#{filter_values} as #{filter_val_name})"
          query_elements[:from] = "#{filter_arr_name}, UNNEST(#{filter_arr_name}.#{filter_val_name}) AS #{filter_where_val}"
          query_elements[:where] = "(#{filter_where_val} IN UNNEST(#{column_name}))"
          query_elements[:select] = "#{filter_where_val}"
        elsif search_facet.is_numeric?
          # run a range query (e.g. WHERE organism_age BETWEEN 20 and 60)
          query_elements[:select] = "#{column_name}"
          query_on = column_name
          min_value = facet_obj[:filters][:min]
          max_value = facet_obj[:filters][:max]
          unit = facet_obj[:filters][:unit]
          if search_facet.must_convert?
            query_on = search_facet.big_query_conversion_column
            min_value = search_facet.calculate_time_in_seconds(base_value: min_value, unit_label: unit)
            max_value = search_facet.calculate_time_in_seconds(base_value: max_value, unit_label: unit)
          end
          query_elements[:where] = "#{query_on} BETWEEN #{min_value} AND #{max_value}"
        else
          query_elements[:select] = "#{column_name}"
          # for non-array columns we can pass an array of quoted values and call IN directly
          filter_values = facet_obj[:filters].map {|filter| filter[:id]}
          query_elements[:where] = "#{column_name} IN ('#{filter_values.join('\',\'')}')"
        end
        query_elements
      end

      # convert a list of facet filters into a keyword search for inferred matching
      # treats each facet separately so we can find intersection across all
      def self.convert_filters_for_inferred_search(facets:)
        terms_by_facet = {}
        facets.each do |facet|
          search_facet = facet[:db_facet]
          # only use non-numeric facets
          if search_facet.is_numeric?
            # we can't do inferred matching on numerics, and because the facets are ANDed,
            # the presence of any numeric facets disables inferred search
            return {}
          end
          terms_by_facet[search_facet.identifier] = facet[:filters].map {|filter| filter[:name]}
        end
        terms_by_facet
      end

      # build a match of studies to facets/filters used in search (for labeling studies in UI with matches)
      def self.match_studies_by_facet(query_results, search_facets)
        matches = {}
        query_results.each do |result|
          accession = result[:study_accession]
          matches[accession] ||= {facet_search_weight: 0}
          result.keys.keep_if { |key| key != :study_accession }.each do |key|
            facet_name = key.to_s.chomp('_val')
            matching_filter = match_results_by_filter(search_result: result, result_key: key, facets: search_facets)
            # there may not be a matching filter if the facet was OR'ed
            if matching_filter
              matches[accession][facet_name] ||= []
              if !matches[accession][facet_name].include?(matching_filter)
                matches[accession][facet_name] << matching_filter
                matches[accession][:facet_search_weight] += 1
              end
            end
          end
        end
        matches
      end

      # Simplify TDR results to be mappable for the UI badges for faceted search
      def self.simplify_tdr_facet_search_results(query_results, search_facets)
        simple_TDR_result = {}
        simple_TDR_results = []
        query_results.each_pair do |accession, result|
          facet_matches = result[:facet_matches]
          simple_TDR_result[:study_accession] = accession
          if facet_matches.present?
            facet_matches.each { |mapping| 
              mapping.each_pair { |key, val| 
                short_name_field = FacetNameConverter.convert_to_model(:tim, :alex, key, :name)
                simple_TDR_result[short_name_field] = val
              }
            }
          end
          simple_TDR_results << simple_TDR_result
        end
        simple_TDR_results
      end


      # find matching filters within a given facet based on query parameters
      def self.find_matching_filters(facet:, filter_values:)
        matching_filters = []
        if facet.is_numeric?
          # if we have more than two values, we likely have a unit parameter and need to convert values
          if filter_values.size > 2 && SearchFacet::TIME_UNITS.include?(filter_values.last)
            requested_unit = filter_values.slice!(-1)
          end
          min_value, max_value = filter_values.map(&:to_f)
          facet_min = facet.min.dup
          facet_max = facet.max.dup
          # if unit was sent in query, convert
          if requested_unit.present? && facet.must_convert?
            facet_min = facet.convert_time_between_units(base_value: facet_min, original_unit: facet.unit, new_unit: requested_unit)
            facet_max = facet.convert_time_between_units(base_value: facet_max, original_unit: facet.unit, new_unit: requested_unit)
          end
          if min_value >= facet_min || max_value <= facet_max
            matching_filters = {min: min_value, max: max_value, unit: requested_unit}
          end
        else
          facet.filters.each do |filter|
            if filter_values.include?(filter[:id])
              matching_filters << filter
            end
          end
        end
        matching_filters
      end

      # build a map of facet filter matches to studies for computing simplistic weights for scoring
      def self.match_results_by_filter(search_result:, result_key:, facets:)
        facet_name = result_key.to_s.chomp('_val')
        matching_facet = facets.detect { |facet| facet[:id] == facet_name }
        db_facet = matching_facet[:db_facet]
        if db_facet.is_numeric?
          match = matching_facet[:filters].dup
          match.delete(:name)
          return match
        else
          return matching_facet[:filters].detect { |filter| filter[:id] == search_result[result_key] || filter[:name] == search_result[result_key]}
        end
      end

      # execute a search in TDR and get back normalized results
      def self.get_tdr_results(selected_facets:, terms:)
        results = {}
        begin
          if selected_facets.present?
            facet_json = ApplicationController.data_repo_client.generate_query_from_facets(selected_facets)
          end
          if terms.present?
            term_json = ApplicationController.data_repo_client.generate_query_from_keywords(terms)
          end
          # now we merge the two queries together to perform a single search request
          query_json = ApplicationController.data_repo_client.merge_query_json(facet_query: facet_json, term_query: term_json)
          logger.info "Executing TDR query with: #{query_json}"
          snapshot_ids = AdminConfiguration.get_tdr_snapshot_ids
          logger.info "Scoping TDR query to snapshots: #{snapshot_ids.join(', ')}" if snapshot_ids.present?
          raw_tdr_results = ApplicationController.data_repo_client.query_snapshot_indexes(query_json,
                                                                                          snapshot_ids: snapshot_ids)
          added_file_ids = {}
          raw_tdr_results['result'].each do |result_row|
            results = process_tdr_result_row(result_row, results,
                                             selected_facets: selected_facets,
                                             terms: terms,
                                             added_file_ids: added_file_ids)
          end
        rescue RestClient::Exception => e
          Rails.logger.error "Error querying TDR: #{e.class.name} -- #{e.message}"
          ErrorTracker.report_exception(e, nil, selected_facets, { terms: terms })
        end
        results
      end

      # process an individual result row from TDR
      # added_file_ids is a hash to ensure the same file is not added multiple times -- this method will
      # handle adding to and checking it.
      def self.process_tdr_result_row(row, results, selected_facets:, terms:, added_file_ids:)
        # get column name mappings for assembling results
        short_name_field = FacetNameConverter.convert_to_model(:tim, :accession, :name)
        name_field = FacetNameConverter.convert_to_model(:tim, :study_name, :name)
        description_field = FacetNameConverter.convert_to_model(:tim, :study_description, :name)
        short_name = row[short_name_field]
        results[short_name] ||= {
          tdr_result: true, # identify this entry as coming from Data Repo
          accession: short_name,
          name: row[name_field],
          description: row[description_field],
          project_id: row['project_id'],
          facet_matches: [],
          term_matches: [],
          file_information: []
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
        # if the output_id is a drs_id, add it and the output_type to the file_information array,
        if row['output_id']&.starts_with?('drs')
          drs_id = row['output_id']
          if !added_file_ids[drs_id]
            result[:file_information] << {
              drs_id: drs_id,
              file_type: row['output_type']
            }
            added_file_ids[drs_id] = true
          end
        end
        results
      end

      # determine facet matches for an individual result row from TDR
      def self.get_facet_match_for_tdr_result(facet, result_row)
        tdr_name = FacetNameConverter.convert_to_model(:tim, facet[:id], :name)
        if facet[:filters].is_a? Hash
          # this is a numeric facet, so convert to range for match
          # TODO: determine correct unit/datatype and convert
          filter_value = "#{facet.dig(:filters, :min).to_i}-#{facet.dig(:filters, :max).to_i}"
          matches = result_row.each_pair.select { |col, val| col == tdr_name && val == filter_value }
        else
          matches = []
          facet[:filters].each do |filter|
            matches << result_row.each_pair.select { |col, val| col == tdr_name && (val == filter[:name] || val == filter[:id] ) }
                                 .flatten                                 
          end
        end
        matches.reject! { |key, value| key.blank? || value.blank? }
        matches
      end

      # determine term/keyword match for an individual result row from TDR
      def self.get_term_match_for_tdr_result(term, result_row)
        name_field = FacetNameConverter.convert_to_model(:tim, :study_name, :name)
        description_field = FacetNameConverter.convert_to_model(:tim, :study_description, :name)
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
    end
  end
end
