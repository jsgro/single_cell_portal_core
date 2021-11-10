# since we have changed the basic association types, we can no longer use the dynamic methods of :branding_group_id or
# :user_id to reference back to the parent models.  Since the data exists in the documents, we can call :attributes to
# load existing data and create maps with which to set new associations
class SetNewCollectionAssociations < Mongoid::Migration
  def self.up
    # create maps showing existing associations
    study_map = Study.all.map do |s|
      if s.attributes[:branding_group_id].present? && s.attributes[:branding_group_id].is_a?(BSON::ObjectId)
        { s.id.to_s => s.attributes[:branding_group_id] }
      end
    end.compact.reduce({}, :merge)
    collection_map = BrandingGroup.all.map do |col|
      {
        col.id.to_s => {
          users: [col.attributes[:user_id]],
          studies: study_map.select {|_, c_id| c_id == col.id }.keys.map { |id| BSON::ObjectId.from_string(id)}
        }
      }
    end.compact.reduce({}, :merge)
    user_map = {}
    collection_map.each do |c_id, vals|
      user_id = vals[:users].first.to_s
      user_map[user_id] ||= []
      user_map[user_id] << BSON::ObjectId.from_string(c_id)
    end
    # perform new assignments for studies & collections
    BrandingGroup.all.each do |collection|
      associations = collection_map[collection.id.to_s]
      collection.update(study_ids: associations[:studies], user_ids: associations[:users])
      Study.where(:id.in => associations[:studies]).update_all(branding_group_ids: [collection.id])
    end
    # assign collections to users
    user_map.each do |user_id, col_ids|
      user = User.find(user_id)
      user.update(branding_group_ids: col_ids)
    end
  end

  def self.down
    BrandingGroup.update_all(study_ids: [], user_ids: [])
    Study.update_all(branding_group_ids: [])
    User.update_all(branding_group_ids: [])
  end
end
