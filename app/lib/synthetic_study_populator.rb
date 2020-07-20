
# class to populate synthetic studies from files.
# See db/seed/synthetic_studies for examples of the file formats
# overwrite keyword parameter dictates whether to delete & recreate an existing study
class SyntheticStudyPopulator
  DEFAULT_SYNTHETIC_STUDY_PATH = Rails.root.join('db', 'seed', 'synthetic_studies')
  # populates all studies defined in db/seed/synthetic_studies
  def self.populate_all(user: User.first, overwrite: true)
    study_names = Dir.glob(DEFAULT_SYNTHETIC_STUDY_PATH.join('*')).select {|f| File.directory? f}
    study_names.each do |study_name|
      populate(study_name, user: user, overwrite: overwrite)
    end
  end

  # populates the synthetic study specified in the given folder (e.g. ./db/seed/synthetic_studies/blood)
  # destroys any existing studies and workspace data corresponding to that study
  # overwrite keyword parameter dictates whether to delete & recreate an existing study
  def self.populate(synthetic_study_folder, user: User.first, overwrite: true)
    if (synthetic_study_folder.exclude?('/'))
      synthetic_study_folder = DEFAULT_SYNTHETIC_STUDY_PATH.join(synthetic_study_folder).to_s
    end
    study_info_file = File.read(synthetic_study_folder + '/study_info.json')
    study_config = JSON.parse(study_info_file)

    existing_study = Study.find_by(name: study_config['study']['name'])
    if overwrite || existing_study.nil?
      puts("Populating synthetic study from #{synthetic_study_folder}")
      study = create_study(study_config, user, overwrite: overwrite)
      add_files(study, study_config, synthetic_study_folder, user)
    end
  end

  private

  def self.create_study(study_config, user, overwrite: true)
    existing_study = Study.find_by(name: study_config['study']['name'])
    if existing_study && overwrite
      puts("Destroying Study #{existing_study.name}, id #{existing_study.id}")
      existing_study.destroy_and_remove_workspace
    end

    if existing_study.nil?
      study = Study.new(study_config['study'])
      study.user ||= user
      study.firecloud_project ||= ENV['PORTAL_NAMESPACE']
      puts("Saving Study #{study.name}")
      study.save!
      study
    else
      existing_study
    end
  end

  def self.add_files(study, study_config, synthetic_study_folder, user)
    file_infos = study_config['files']
    file_infos.each do |finfo|
      infile = File.open("#{synthetic_study_folder}/#{finfo['filename']}")
      taxon_id = nil
      if finfo['species_scientific_name'].present?
        taxon = Taxon.find_by(scientific_name: finfo['species_scientific_name'])
        if taxon.nil?
          throw "You must populate the species #{finfo['species_scientific_name']} to ingest the file #{finfo['filename']}. Stopping populate"
        end
        taxon_id = taxon.id
      elsif finfo['type'] == 'Expression Matrix'
        throw "You must specify a species in the study_info.json for Expression Matrix files"
      end

      study_file = StudyFile.create!(file_type: finfo['type'],
                        name: finfo['name'] ? finfo['name'] : finfo['filename'],
                        upload: infile,
                        use_metadata_convention: finfo['use_metadata_convention'] ? true : false,
                        status: 'uploading',
                        study: study,
                        taxon_id: taxon_id)
      FileParseService.run_parse_job(study_file, study, user)
    end
  end

  # utility method to generate a study_info.json file string from an existing study
  # useful for, e.g., downloading all the files from a production study to your local machine,
  # and then using SyntheticStudyPopulator to ingest it
  def self.generate_study_info_json(study)
    info = {}
    info['study'] = {name: study.name, description: study.description, data_dir: 'test'}
    info['files'] = study.study_files.map{|f| { filename: f.name, type: f.file_type}}
    puts JSON.pretty_generate(info)
  end
end
