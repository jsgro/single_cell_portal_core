
# class to populate synthetic studies from files.
# See db/seed/synthetic_studies for examples of the file formats
class SyntheticStudyPopulator
  DEFAULT_SYNTHETIC_STUDY_PATH = Rails.root.join('db', 'seed', 'synthetic_studies')
  # populates all studies defined in db/seed/synthetic_studies
  def self.populate_all(user: User.first)
    study_names = Dir.glob(DEFAULT_SYNTHETIC_STUDY_PATH.join('*')).select {|f| File.directory? f}
    study_names.each do |study_name|
      populate(study_name, user: user)
    end
  end

  # populates the synthetic study specified in the given folder (e.g. ./db/seed/synthetic_studies/blood)
  # destroys any existing studies and workspace data corresponding to that study
  def self.populate(synthetic_study_folder, user: User.first)
    if (synthetic_study_folder.exclude?('/'))
      synthetic_study_folder = DEFAULT_SYNTHETIC_STUDY_PATH.join(synthetic_study_folder).to_s
    end
    study_info_file = File.read(synthetic_study_folder + '/study_info.json')
    study_config = JSON.parse(study_info_file)

    puts("Populating synthetic study from #{synthetic_study_folder}")
    study = create_study(study_config, user)
    add_files(study, study_config, synthetic_study_folder, user)
  end

  # find all matching instances of synthetic studies
  def self.collect_synthetic_studies
    study_names = []
    synthetic_base_path = DEFAULT_SYNTHETIC_STUDY_PATH
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

  def self.create_study(study_config, user)
    existing_study = Study.find_by(name: study_config['study']['name'])
    if existing_study
      puts("Destroying Study #{existing_study.name}, id #{existing_study.id}")
      existing_study.destroy_and_remove_workspace
    end

    study = Study.new(study_config['study'])
    study.study_detail = StudyDetail.new(full_description: study_config['study']['description'])
    study.user ||= user
    study.firecloud_project ||= ENV['PORTAL_NAMESPACE']
    puts("Saving Study #{study.name}")
    study.save!
    study
  end

  def self.add_files(study, study_config, synthetic_study_folder, user)
    file_infos = study_config['files']
    file_infos.each do |finfo|
      infile = File.open("#{synthetic_study_folder}/#{finfo['filename']}")

      study_file_params = {
        file_type: finfo['type'],
        name: finfo['name'] ? finfo['name'] : finfo['filename'],
        upload: infile,
        use_metadata_convention: finfo['use_metadata_convention'] ? true : false,
        status: 'uploading',
        study: study
      }

      study_file_params.merge!(process_genomic_file_params(finfo))
      study_file_params.merge!(process_coordinate_file_params(finfo))

      if study_file_params[:file_type] == 'Expression Matrix'
        exp_finfo_params = finfo['expression_file_info']
        if exp_finfo_params.present?
          exp_file_info = ExpressionFileInfo.new(
            is_raw_counts: exp_finfo_params['is_raw_counts'] ? true : false,
            units: exp_finfo_params['units'],
            library_construction_protocol: exp_finfo_params['library_construction_protocol']
          )
          study_file_params['expression_file_info'] = exp_file_info
        end
      end

      study_file = StudyFile.create!(study_file_params)
      if !study.detached
        FileParseService.run_parse_job(study_file, study, user)
      end
    end
  end

  # process coordinate/cluster arguments, return a hash of params suitable for passing to a StudyFile constructor
  def self.process_coordinate_file_params(file_info)
    params = {}
    if !file_info['is_spatial'].nil?
      params[:is_spatial] = file_info['is_spatial']
    end
    params
  end

  # process species/annotation arguments, return a hash of params suitable for passing to a StudyFile constructor
  def self.process_genomic_file_params(file_info)
    params = {}
    taxon_id = nil
    if file_info['species_scientific_name'].present?
      taxon = Taxon.find_by(scientific_name: file_info['species_scientific_name'])
      if taxon.nil?
        throw "You must populate the species #{file_info['species_scientific_name']} to ingest the file #{file_info['filename']}. Stopping populate"
      end
      params[:taxon_id] = taxon.id
    end
    if file_info['genome_assembly_name'].present?
      if  params[:taxon_id].nil?
        throw "You must specify species_scientific_name to specify genome_assembly in #{file_info['filename']}. Stopping populate"
      end
      assembly = GenomeAssembly.find_by(name: file_info['genome_assembly_name'], taxon_id: params[:taxon_id])
      if assembly.nil?
        throw "You must populate the assembly #{file_info['genome_assembly_name']} to ingest the file #{file_info['filename']}. Stopping populate"
      end
      params[:genome_assembly_id] = assembly.id
    end
    if file_info['genome_annotation_name'].present?
      if params[:genome_assembly_id].nil?
        throw "You must specify genome_annotation_name to specify genome_annotation in #{file_info['filename']}. Stopping populate"
      end
      annotation = GenomeAnnotation.find_by(name: file_info['genome_annotation_name'], genome_assembly_id: params[:genome_assembly_id])
      if assembly.nil?
        throw "You must populate the GenomeAnnotation #{file_info['genome_annotation_name']} to ingest the file #{file_info['filename']}. Stopping populate"
      end
      params[:genome_annotation_id] = annotation.id
    end
    params
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
