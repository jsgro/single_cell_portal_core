class AddAzulFacetFiltersToSearchFacets < Mongoid::Migration
  def self.up
    SearchFacet.update_all_facet_filters
  end

  def self.down
    # calling :update_filter_values! w/o passing in external Azul results will revert back to BigQuery only
    SearchFacet.all.map(&:update_filter_values!)
  end
end
