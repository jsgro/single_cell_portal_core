class ReportsService

  REPORTS = {
    studies: {
      name: 'Study Report',
      service_method: :study_data,
      data_columns: %i[accession created_at cell_count user_id public view_count
                       owner_domain owner_email admin_owned metadata_convention
                       metadata_file_created has_raw_counts]
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
    all_studies = Study.where(queued_for_deletion: false)
    study_hash = {}
    all_studies.each do |study|
      study_id = study.id.to_s
      # make a hash of study attributes using the keys from above
      study_hash[study_id] = Hash[keys.zip(keys.map { |k| study.send(k) })]
      study_hash[study_id][:share_count] = study.study_shares.count
      user = study.user
      user_domain = user.email.split('@').last
      study_hash[study_id][:owner_domain] = user_domain
      study_hash[study_id][:owner_email] = user.email
      study_hash[study_id][:admin_owned] = !!user.admin # account for nil by casting to boolean

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
    study_hash.values
  end
end
