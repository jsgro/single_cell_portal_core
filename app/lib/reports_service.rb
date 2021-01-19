class ReportsService

  REPORTS = {
    studies: {
      name: 'Study Report',
      service_method: :study_data,
      data_columns: %i[accession created_at cell_count user_id public view_count
                       owner_domain owner_email admin_owned metadata_convention
                       metadata_file_created has_raw_counts]
    }
  }

  # fetches the report data for the given report, and returns it as a tsv string
  def self.get_report_data(report_name)
    report_obj = REPORTS[report_name.to_sym]
    if report_obj.nil?
      raise "Unrecognized report #{report_name}"
    end

    data = ReportsService.send(report_obj[:service_method])

    response_array = [report_obj[:data_columns].join("\t")]
    study_strings = study_data.map {|study_hash| study_hash.values_at(*report_obj[:data_columns]).join("\t")}
    return response_array.concat(study_strings).join("\n")
  end

  # returns an array of hashes representing summary data for each study.
  # each entry in the array is a study
  def self.study_data
    study_fields = []
    all_studies = Study.where(queued_for_deletion: false)
                        .pluck(:id, :accession, :created_at, :cell_count, :user_id, :public, :view_count)
                        .map do |id, accession, created_at, cell_count, user_id, public, view_count|
                          {
                            id: id,
                            accession: accession,
                            created_at: created_at,
                            cell_count: cell_count,
                            user_id: user_id,
                            view_count: view_count,
                            public: public
                          }
                        end
    # make a hash of study_id => study object
    study_hash = {}
    all_studies.each {|s| study_hash[s[:id]] = s}

    # build a hash of study_id => # of shares
    share_count_hash = Hash.new(0)
    StudyShare.pluck(:study_id).each { |id| share_count_hash[id] += 1 }
    # add share_count column to study_hash
    share_count_hash.each { |id, count| study_hash[id][:share_count] = count }

    # build a hash of user => domain
    user_domain_hash = Hash.new(0)
    User.pluck(:id, :email, :admin).each do |id, email, admin|
      user_domain_hash[id] = {
        domain: email.split('@').last,
        email: email,
        admin: admin
      }
    end
    # add domain column to study_hash
    study_hash.each do |id, study|
      study[:owner_domain] = user_domain_hash[study[:user_id]][:domain]
      study[:owner_email] = user_domain_hash[study[:user_id]][:email]
      study[:admin_owned] = user_domain_hash[study[:user_id]][:admin]
    end

    # build a hash of metadata files to study_id
    metadata_files = StudyFile.where(file_type: 'Metadata')
                              .pluck(:study_id, :use_metadata_convention, :created_at)
    metadata_files.each do |study_id, convention, created_at|
      if study_hash[study_id] # check so we don't error for orphaned study files
        study_hash[study_id][:metadata_convention] = convention
        study_hash[study_id][:metadata_file_created] = created_at
      end
    end

    # build a hash of metadata files to study_id
    expression_files = StudyFile.where(file_type: 'Expression Matrix')
                                .pluck(:study_id, 'expression_file_info.is_raw_counts')
    expression_files.each do |study_id, is_raw_counts, created_at|
      if study_hash[study_id] # check so we don't error for orphaned study files
        # mongoid plucks nested fields as {"is_raw_counts"=>true} objects rather than plain values
        is_raw_counts_val = is_raw_counts.present? ? is_raw_counts['is_raw_counts'] : false
        study_hash[study_id][:has_raw_counts] = study_hash[study_id][:has_raw_counts] || is_raw_counts_val
      end
    end

    study_hash.values
  end
end
