class CleanUpOrphanedExternalResources < Mongoid::Migration
  def self.up
    ids_to_delete = []
    ExternalResource.all.each do |external_resource|
      # external_resource.resource_links will call back to the parent object, be it a study or analysis_configuration
      # due to a mis-configuration on both associations, external_resource objects have not been destroyed when their
      # parent object is destroyed, leading to many orphaned records
      ids_to_delete << external_resource.id if external_resource.resource_links.nil?
    end
    ExternalResource.where(:id.in => ids_to_delete).delete_all
  end

  def self.down
  end
end
