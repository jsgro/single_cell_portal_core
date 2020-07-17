##
# SyntheticBrandingGroupPopulator: class to populate branding groups using the output of SyntheticStudyPopulator
##

class SyntheticBrandingGroupPopulator
  BASE_BRANDING_GROUPS_CONFIG_PATH = Rails.root.join('db', 'seed', 'synthetic_branding_groups')

  # populate all branding groups using synthetic studies
  #
  # @param user (User)                 => User account to own the branding groups
  # @param overwrite_groups (Boolean)  => T/F for destroying/recreating any existing groups
  # @param overwrite_studies (Boolean) => T/F for destroying/recreating any existing studies
  def self.populate_all(user: User.first, overwrite_groups: true, overwrite_studies: false)
    # populate all studies first to ensure they exist
    SyntheticStudyPopulator.populate_all(overwrite: overwrite_studies)
    synthetic_studies_ids = self.collect_synthetic_studies.pluck(:id)
    # divide into two groups, one for human data, another for mouse
    human_studies = Study.where(name: /human/i, :id.in => synthetic_studies_ids)
    mouse_studies = Study.where(name: /(mouse|murine)/i, :id.in => synthetic_studies_ids)
    if human_studies.empty? || mouse_studies.empty?
      raise ArgumentError.new("Required synthetic studies not present, please manually run SyntheticStudyPopulator.populate_all")
    end
    group_dirs = Dir.glob(BASE_BRANDING_GROUPS_CONFIG_PATH.join('*')).select {|f| File.directory? f}
    group_dirs.each do |group_dir|
      # detect if this is the human or mouse group
      group_type = group_dir.split('/').last.split('_').first
      study_list = group_type == 'human' ? human_studies : mouse_studies
      self.populate(group_dir, user: user, study_list: study_list, overwrite: overwrite_groups)
    end
  end

  # create a single branding group and associate designated studies
  #
  # @param config_dir (Pathname, String)  => Directory pathname containing configuration JSON for branding group
  # @param user (User)                    => User account to own branding group
  # @param study_list (Mongoid::Criteria) => List of studies to associate with new branding group
  # @param overwrite (Boolean)            => T/F for destroying/recreating an existing group
  def self.populate(config_dir, user: User.first, study_list:, overwrite: true)
    synthetic_group_folder = BASE_BRANDING_GROUPS_CONFIG_PATH.join(config_dir.chomp('/')).to_s
    group_info_file = File.read(File.join(synthetic_group_folder, 'branding_group_info.json'))
    branding_group_config = JSON.parse(group_info_file)

    puts("Populating synthetic branding group from #{synthetic_group_folder}")
    branding_group = create_branding_group(branding_group_config, user, overwrite: overwrite)
    # assign new branding group to all studies
    study_list.update_all(branding_group_id: branding_group.id)
  end

  # find all matching instances of synthetic studies
  def self.collect_synthetic_studies
    study_names = []
    synthetic_base_path = SyntheticStudyPopulator::DEFAULT_SYNTHETIC_STUDY_PATH
    study_dirs = Dir.glob(synthetic_base_path.join('*')).select {|f| File.directory? f}
    study_dirs.each do |study_dir|
      synthetic_study_folder = synthetic_base_path.join(study_dir).to_s
      study_info_file = File.read(synthetic_study_folder + '/study_info.json')
      study_config = JSON.parse(study_info_file)
      study_names << study_config.dig('study', 'name')
    end
    Study.where(:name.in => study_names)
  end

  private

  def self.create_branding_group(branding_group_info, user, overwrite: true)
    existing_group = BrandingGroup.find_by(name: branding_group_info['branding_group']['name'])
    if existing_group && overwrite
      puts "Destroying exiting branding group #{existing_group.name}"
      existing_group.destroy
    end

    if existing_group.nil?
      branding_group = BrandingGroup.new(branding_group_info['branding_group'])
      branding_group.user ||= user
      image_info = branding_group_info['images']
      # dynamically assign image files
      image_info.each do |attribute_name, filename|
        image_file = File.open(Rails.root.join('test', 'test_data', 'branding_groups', filename))
        branding_group.send("#{attribute_name}=", image_file)
      end
      puts "Saving branding group #{branding_group.name}"
      branding_group.save!
      branding_group
    else
      puts "Preserving existing branding group #{existing_group.name}"
      existing_group
    end
  end
end
