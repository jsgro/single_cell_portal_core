class ReportsService

  REPORTS = {
    studies: {
      name: 'Study Report',
      service_method: :study_data,
      data_columns: %i[accession created_at cell_count user_id public view_count
                       owner_domain owner_email admin_owned metadata_convention
                       metadata_file_created has_raw_counts last_public last_initialized]
    }
  }.freeze

  # fetches the report data for the given report, and returns it as a tsv string
  def self.get_report_data(report_name)
    report_obj = REPORTS[report_name.to_sym]
    raise ArgumentError, "Unrecognized report: '#{report_name}'" if report_obj.nil?

    headers = report_obj[:data_columns].join("\t")
    data = ReportsService.send(report_obj[:service_method])
    report = data.map { |data_hash| data_hash.values_at(*report_obj[:data_columns]).join("\t") }
    [headers, report].join("\n")
  end

  # returns an array of hashes representing summary data for each study.
  # each entry in the array is a study
  def self.study_data
    keys = %i[id accession created_at cell_count user_id view_count public]
    # get all valid studies, ignoring ones w/o user set which can happen sometimes in tests during cleanup
    all_studies = Study.where(queued_for_deletion: false)
    study_hash = {}
    all_studies.each do |study|
      study_id = study.id.to_s
      # make a hash of study attributes using the keys from above
      study_hash[study_id] = Hash[keys.zip(keys.map { |k| study.send(k) })]
      study_hash[study_id][:share_count] = study.study_shares.count
      user = study.user
      # handle case where in tests sometimes user gets unset on a study - would not happen in live usage,
      # but it is an order of operations issue in CI that as of yet we cannot determine the cause of
      if study.user.present?
        user_domain = user.email.split('@').last
        study_hash[study_id][:owner_domain] = user_domain
        study_hash[study_id][:owner_email] = user.email
        study_hash[study_id][:admin_owned] = !!user.admin # account for nil by casting to boolean
      else
        study_hash[study_id][:owner_domain] = 'N/A'
        study_hash[study_id][:owner_email] = 'N/A'
        study_hash[study_id][:admin_owned] = 'N/A' # account for nil by casting to boolean
      end

      metadata_files = StudyFile.where(file_type: 'Metadata', queued_for_deletion: false, study_id: study_id)
                                .pluck(:use_metadata_convention, :created_at)
      metadata_files.each do |convention, created_at|
        study_hash[study_id][:metadata_convention] = !!convention # account for nil by casting to boolean
        study_hash[study_id][:metadata_file_created] = created_at
      end
      expression_files = StudyFile.where(file_type: /Matrix/, queued_for_deletion: false, study_id: study_id)
                                  .pluck('expression_file_info.is_raw_counts')
      expression_files.each do |is_raw_counts|
        # mongoid plucks nested fields as {"is_raw_counts"=>true} objects rather than plain values
        study_hash[study_id][:has_raw_counts] ||= is_raw_counts.present? ? is_raw_counts['is_raw_counts'] : false
      end
    end

    history_hash = ReportsService.study_histories
    study_hash.keys.each do |study_id|
      study_hash[study_id][:last_public] = history_hash[study_id] ? history_hash[study_id][:last_public] : nil
      study_hash[study_id][:last_initialized] = history_hash[study_id] ? history_hash[study_id][:last_initialized] : nil
    end

    study_hash.values
  end

  def self.study_histories()
    study_hash = {}
    public_histories = HistoryTracker.where(scope: 'study', 'modified.public': true).order_by(created_at: :asc)
    public_histories.each do |history|
      study_id = history.association_chain[0]['id'].to_s
      study_hash[study_id] = {last_public: history.created_at}
    end
    initialized_histories = HistoryTracker.where(scope: 'study', 'modified.initialized': true).order_by(created_at: :asc)
    initialized_histories.each do |history|
      study_id = history.association_chain[0]['id'].to_s
      study_hash[study_id] ||= {}
      study_hash[study_id][:last_initialized] = history.created_at
    end
    study_hash
  end
end
