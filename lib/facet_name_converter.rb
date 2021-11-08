# class for converting from Alexandria convention names to HCA or TIM metadata model names (i.e. columns, not  values)
# this is currently for PoC work on XDSS - eventually this will be replaced by an onotology server that can handle
# conversions programmatically
class FacetNameConverter
  # controlled list of metadata schema names
  SCHEMA_NAMES = %i[alexandria tim hca azul].freeze

  # map of Alexandria metadata convention names to HCA 'short' names
  ALEXANDRIA_TO_HCA = {
    'biosample_id' => 'biosample_id',
    'cell_type' => 'cell_type',
    'donor_id' => 'donor_id',
    'disease' => 'disease',
    'library_preparation_protocol' => 'library_construction_method',
    'organ' => 'organ',
    'organ_region' => 'organ_parts',
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
    'organ_region' => 'TerraCore:hasAnatomicalRegion',
    'organism_age' => 'organism_age',
    'sex' => 'TerraCore:hasSex',
    'species' => 'TerraCore:hasOrganismType',
    'study_name' => 'dct:title',
    'study_description' => 'dct:description',
    'accession' => 'rdfs:label'
  }.with_indifferent_access.freeze

  # map of alexandria names to HCA Azul facet names (for searching projects/files via the Azul API)
  ALEXANDRIA_TO_AZUL = {
    'biosample_id' => 'sampleId',
    'cell_type' => 'selectedCellType',
    'disease' => 'sampleDisease',
    'library_preparation_protocol' => 'libraryConstructionApproach',
    'organ' => 'organ',
    'organ_region' => 'organPart',
    'organism_age' => 'organismAge',
    'preservation_method' => 'preservationMethod',
    'sex' => 'biologicalSex',
    'species' => 'genusSpecies',
    'study_accession' => 'projectShortname',
    'study_description' => 'projectDescription',
    'study_name' => 'projectTitle'
  }.with_indifferent_access.freeze

  # inverted mappings of TIM/HCA to Alexandria
  TIM_TO_ALEXANDRIA = ALEXANDRIA_TO_TIM.invert.freeze
  HCA_TO_ALEXANDRIA = ALEXANDRIA_TO_HCA.invert.freeze
  AZUL_TO_ALEXANDRIA = ALEXANDRIA_TO_AZUL.invert.freeze

  # convert a metadata schema column name from one schema to another
  # e.g. FacetNameConverter.convert_schema_column(:alexandria, :tim, 'species') => 'TerraCore:hasOrganismType'
  #
  # * *params*
  #   - +source_schema+ (String, Symbol) => Name of schema to convert from SCHEMA_NAMES
  #   - +target_schema+ (String, Symbol) => Name of schema to convert to SCHEMA_NAMES
  #   - +column_name+ (String, Symbol) => column name to convert from source_schema
  #
  # * *returns*
  #   - (String) => String value of requested column/property
  #
  # * *raises*
  #   - (ArgumentError) => if source/target schema do not exist
  def self.convert_schema_column(source_schema, target_schema, column_name)
    validate_map_name(source_schema, target_schema)
    mappings = get_map(source_schema, target_schema)
    mappings&.send(:[], column_name) || column_name
  end

  # check if a column exists in a metadata schema
  #
  # * *params*
  #   - +source_schema+ (String, Symbol) => Name of schema to convert from SCHEMA_NAMES
  #   - +target_schema+ (String, Symbol) => Name of schema to convert to SCHEMA_NAMES
  #   - +column_name+ (String, Symbol) => column name to convert from source_schema
  #
  # * *returns*
  #   - (Boolean) => T/F if column exists
  #
  # * *raises*
  #   - (ArgumentError) => if source/target schema do not exist
  def self.schema_has_column?(source_schema, target_schema, column_name)
    validate_map_name(source_schema, target_schema)
    mappings = get_map(source_schema, target_schema)
    !!(mappings&.key? column_name)
  end

  # return a constant of the requested map
  #
  # * *params*
  #   - +source_schema+ (String, Symbol) => Name of schema to convert from SCHEMA_NAMES
  #   - +target_schema+ (String, Symbol) => Name of schema to convert to SCHEMA_NAMES
  #
  # * *returns*
  #   - (Hash, Nil::NilClass) => Hash of mappings, or nil if not present
  #
  # * *raises*
  #   - (ArgumentError) => if source/target schema do not exist
  def self.get_map(source_schema, target_schema)
    validate_map_name(source_schema, target_schema)
    map_name = "FacetNameConverter::#{source_schema.upcase}_TO_#{target_schema.upcase}"
    map_name.constantize if Object.const_defined? map_name
  end

  # validate that requested schemas exist
  #
  # * *params*
  #   - +source_schema+ (String, Symbol) => Name of schema to convert from SCHEMA_NAMES
  #   - +target_schema+ (String, Symbol) => Name of schema to convert to SCHEMA_NAMES
  #
  # * *raises*
  #   - (ArgumentError) => if source/target schema do not exist
  def self.validate_map_name(source_schema, target_schema)
    invalid_schemas = [source_schema.to_sym, target_schema.to_sym] - SCHEMA_NAMES
    raise ArgumentError, "invalid schema conversion: #{invalid_schemas.join(', ')}" if invalid_schemas.any?
  end

  private_class_method :validate_map_name
end
