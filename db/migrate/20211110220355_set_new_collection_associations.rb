# since we have changed the basic association types, we can no longer use the dynamic methods of :branding_group_id or
# :user_id to reference back to the parent models.  Since the data exists in the documents, we can call :attributes to
# load existing data directly from MongoDB and create maps with which to set new associations
class SetNewCollectionAssociations < Mongoid::Migration
  def self.up
    # create maps showing existing associations
    study_list = ActiveRecordUtils.pluck_to_hash(Study, [:id, :branding_group_id])
    study_map = study_list.map do |entry|
      if entry[:branding_group_id]&.is_a?(BSON::ObjectId)
        { entry[:id].to_s => entry[:branding_group_id] }
      end
    end.compact.reduce({}, :merge)
    collection_map = BrandingGroup.all.map do |col|
      {
        col.id.to_s => {
          users: [User.find(col.attributes[:user_id])],
          studies: study_map.select {|_, c_id| c_id == col.id }.keys.map { |id| Study.find(id) }
        }
      }
    end.compact.reduce({}, :merge)
    # perform new assignments for collections
    # this will also update all associated studies/users via :has_and_belongs_to_many association on each
    BrandingGroup.all.each do |collection|
      associations = collection_map[collection.id.to_s]
      collection.update(studies: associations[:studies], users: associations[:users])
    end
  end

  def self.down
    BrandingGroup.update_all(study_ids: [], user_ids: [])
    Study.update_all(branding_group_ids: [])
    User.update_all(branding_group_ids: [])
  end
end
