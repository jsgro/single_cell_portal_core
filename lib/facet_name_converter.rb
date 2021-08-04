# class for converting from Alexandria convention names to HCA or TIM metadata model names (i.e. columns, not individual values)
# this is currently for PoC work on XDSS - eventually this will be replaced by an onotology server that can handle
# conversions programmatically
class FacetNameConverter
  # map of Alexandria metadata convention names to HCA 'short' names
  ALEXANDRIA_TO_HCA = {
    'biosample_id' => 'biosample_id',
    'cell_type' => 'cell_type',
    'donor_id' => 'donor_id',
    'disease' => 'disease',
    'library_preparation_protocol' => 'library_construction_method',
    'organ' => 'organ',
    'organism_age' => 'organism_age',
    'sex' => 'sex',
    'species' => 'genus_species',
    'study_name' => 'project_title',
    'study_description' => 'project_description',
    'accession' => 'project_short_name'
  }.with_indifferent_access.freeze

  # map of Alexandria metadata convention names to namespace Terra Interoperability Model (TIM) names
  ALEXANDRIA_TO_TIM = {
    'biosample_id' => 'dct:identifier',
    'donor_id' => 'prov:wasDerivedFrom',
    'disease' => 'TerraCore:hasDisease',
    'library_preparation_protocol' => 'TerraCore:hasLibraryPrep',
    'organ' => 'TerraCore:hasAnatomicalSite',
    'organism_age' => 'organism_age',
    'sex' => 'TerraCore:hasSex',
    'species' => 'TerraCore:hasOrganismType',
    'study_name' => 'dct:title',
    'study_description' => 'dct:description',
    'accession' => 'rdfs:label'
  }.with_indifferent_access.freeze

  # inverted mappings of TIM/HCA to Alexandria
  TIM_TO_ALEXANDRIA = ALEXANDRIA_TO_TIM.invert.freeze
  HCA_TO_ALEXANDRIA = ALEXANDRIA_TO_HCA.invert.freeze

  # convert column name from one metadata schema to another
  #
  # * *params*
  #   - +source_model+ (String, Symbol) => Name of schema to convert from (:alexandria, :hca or :tim)
  #   - +target_name+ (String, Symbol) => Name of schema to convert to (:alexandria, :hca or :tim)
  #   - +column_name+ (String, Symbol) => facet name to convert
  #
  # * *returns*
  #   - (String) => String value of requested column/property
  def self.convert_to_model(source_model = :alexandria, target_model, column_name)
    mappings = "FacetNameConverter::#{source_model.upcase}_TO_#{target_model.upcase}".constantize
    # perform lookup, but fall back to provided column name if no match is found
    mappings[column_name.to_sym] || column_name
  end
end
