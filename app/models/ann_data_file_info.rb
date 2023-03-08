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
  field :data_fragments, type: Array

  # collect data frame key_names for clustering data inside AnnData flle
  def obsm_key_names
    data_fragments.map { |f| f[:obsm_key_name] }.compact
  end

  # handle AnnData upload form data and merge into appropriate fields so that we can make a single update! call
  def merge_form_data(form_data)
    merged_data = form_data.with_indifferent_access
    # merge in existing information about AnnData file
    anndata_info_attributes = attributes.with_indifferent_access
    anndata_info_attributes[:reference_file] = !!merged_data[:reference_anndata_file]
    fragments = []
    DATA_TYPE_FORM_KEYS.each do |key, form_segment_name|
      fragment_form = merged_data[form_segment_name]
      next if fragment_form.blank?

      case key
      when 'metadata'
        merged_data[:use_metadata_convention] = fragment_form[:use_metadata_convention]
      when 'cluster'
        fragments << extract_form_fragment(fragment_form, key, :name, :description, :obsm_key_name)
      when 'expression'
        merged_data[:taxon_id] = fragment_form[:taxon_id]
        fragments << extract_form_fragment(fragment_form, key, :description)
      end
      # remove from form data once processed to allow normal save of nested form data
      merged_data.delete(form_segment_name)
    end
    merged_data[:ann_data_file_info] = merge_form_fragments(anndata_info_attributes, fragments)
    merged_data
  end

  # extract out a single fragment to append to the entire form later under :data_fragments
  # stores information about individual data types, such as names/descriptions
  def extract_form_fragment(segment, fragment_type, *keys)
    fragment = Hash[keys.zip(keys.map { |k| segment[k] })]
    fragment[:data_type] = fragment_type
    fragment
  end

  # merge in form fragments and finalize data for saving
  def merge_form_fragments(form_data, fragments)
    fragments.each do |fragment|
      existing_frag = find_matching_fragment(fragment)
      idx = existing_frag ? data_fragments.index(existing_frag) : data_fragments.size
      form_data[:data_fragments].insert(idx, fragment)
    end
    form_data
  end

  # find an existing data_fragment based on data_type/names
  # allows updating items in place if names/descriptions change
  def find_matching_fragment(fragment)
    data_fragments.detect do |frag|
      frag[:data_type] == fragment[:data_type] &&
        frag[:name] == fragment[:name] &&
        frag[:obsm_key_name] == fragment[:obsm_key_name]
    end
  end
end
