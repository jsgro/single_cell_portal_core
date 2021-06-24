# class for converting from alexandria convention names to HCA or TIM metadata model names (i.e. columns, not individual values)
# this is currently for PoC work on XDSS - eventually this will be replaced by an onotology server that can handle
# conversions programmatically
class FacetNameConverter
  # map of alexandria metadata convention names to HCA 'short' names
  # not fully namespaced as this is what is indexed in TDR
  ALEXANDRIA_TO_HCA = {
    biosample_id: 'biosample_id',
    cell_type: 'cell_type',
    donor_id: 'donor_id',
    disease: 'disease',
    library_preparation_protocol: 'library_construction_method',
    organ: 'organ',
    organism_age: 'organism_age',
    sex: 'sex',
    species: 'genus_species',
    study_name: 'project_title',
    study_description: 'project_description'
  }

  # TBA, not needed yet
  ALEXANDRIA_TO_TIM = {}

  # convert from SCP metadata names to HCA short names
  #
  # * *params*
  #   - +name+
  def self.to_hca(name)
    ALEXANDRIA_TO_HCA.dig(name.to_sym)
  end

  def self.to_terra_model(name)
    ALEXANDRIA_TO_TIM.dig(name.to_sym)
  end
end
