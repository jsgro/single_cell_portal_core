# stores info about data that has been extracted from AnnData (.h5ad) files
class AnnDataFileInfo
  include Mongoid::Document
  embedded_in :study_file

  # key of fragment data_type to form key name
  DATA_TYPE_FORM_KEYS = {
    expression: 'extra_expression_form_info_attributes',
    metadata: 'metadata_form_info_attributes',
    cluster: 'cluster_form_info_attributes'
  }.freeze

  field :has_clusters, type: Boolean, default: false
  field :has_metadata, type: Boolean, default: false
  field :has_raw_counts, type: Boolean, default: false
  field :has_expression, type: Boolean, default: false
  # controls whether or not to ingest data (true: should not ingest data, this is like an 'Other' file)
  field :reference_file, type: Boolean, default: true
  # information from form about data contained inside AnnData file, such as names/descriptions
  # examples:
  # { data_type: 'cluster', obsm_key_name: 'X_umap', name: 'UMAP', description: 'UMAP clustering' }
  # { data_type: 'expression', description: 'log(TMP) expression' }
  field :data_fragments, type: Array, default: []

  # collect data frame key_names for clustering data inside AnnData flle
  def obsm_key_names
    data_fragments.map { |f| f[:obsm_key_name] }.compact
  end

  # handle AnnData upload form data and merge into appropriate fields so that we can make a single update! call
  def merge_form_data(form_data)
    merged_data = form_data.with_indifferent_access
    # merge in existing information about AnnData file
    anndata_info_attributes = attributes.with_indifferent_access
    # check value of :reference_anndata_file which is passed as a string
    anndata_info_attributes[:reference_file] = merged_data[:reference_anndata_file] == 'true'
    merged_data.delete(:reference_anndata_file)
    fragments = []
    DATA_TYPE_FORM_KEYS.each do |key, form_segment_name|
      fragment_form = merged_data[form_segment_name]
      next if fragment_form.blank? || fragment_form.empty?

      case key
      when :metadata
        merged_data[:use_metadata_convention] = fragment_form[:use_metadata_convention]
      when :cluster
        fragments << extract_form_fragment(
          fragment_form, key,
          :name, :description, :obsm_key_name, :x_axis_label, :y_axis_label, :x_axis_min, :x_axis_max,
          :y_axis_min, :y_axis_max, :z_axis_min, :z_axis_max
        )
      when :expression
        merged_data[:taxon_id] = fragment_form[:taxon_id]
        fragments << extract_form_fragment(fragment_form, key, :description, :y_axis_label)
      end
      # remove from form data once processed to allow normal save of nested form data
      merged_data.delete(form_segment_name)
    end
    merged_data[:ann_data_file_info] = merge_form_fragments(anndata_info_attributes, fragments)
    merged_data
  end

  # extract out a single fragment to append to the entire form later under :data_fragments
  # stores information about individual data types, such as names/descriptions or axis info
  def extract_form_fragment(form_segment, fragment_type, *keys)
    safe_segment = form_segment.with_indifferent_access
    fragment = hash_from_keys(safe_segment, *keys)
    fragment[:data_type] = fragment_type
    fragment
  end

  # merge in form fragments and finalize data for saving
  def merge_form_fragments(form_data, fragments)
    fragments.each do |fragment|
      keys = %i[data_type name obsm_key_name]
      matcher = hash_from_keys(fragment, *keys)
      existing_frag = find_fragment(**matcher)
      idx = existing_frag ? data_fragments.index(existing_frag) : data_fragments.size
      form_data[:data_fragments].insert(idx, fragment)
    end
    form_data
  end

  # find a data_fragment of a given type based on arbitrary key/value pairs
  def find_fragment(**attrs)
    data_fragments.detect do |fragment|
      !{ **attrs }.map { |k, v| fragment[k] == v }.include?(false)
    end
  end

  # mirror of study_file.get_cluster_domain_ranges for data_fragment
  def get_cluster_domain_ranges(name)
    fragment = find_fragment(data_type: :cluster, name:)
    axes = %i[x_axis_min x_axis_max y_axis_min y_axis_max z_axis_min z_axis_max]
    hash_from_keys(fragment, *axes, transform: :to_f)
  end

  private

  # select out keys from source hash and return new one, rejecting blank values
  # will apply transform method if specified, otherwise returns value in place (Object#presence)
  def hash_from_keys(source_hash, *keys, transform: :presence)
    values = keys.map do |key|
      source_hash[key].send(transform) if source_hash[key].present? # skip transform on nil entries
    end
    Hash[keys.zip(values)].reject { |_, v| v.blank? }
  end
end
