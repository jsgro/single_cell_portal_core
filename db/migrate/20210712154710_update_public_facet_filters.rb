class UpdatePublicFacetFilters < Mongoid::Migration
  def self.up
    SearchFacet.update_all_facet_filters
  end

  def self.down
  end
end
