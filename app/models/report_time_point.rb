class ReportTimePoint

  ###
  #
  # ReportTimePoint: generic container for storing time-based reporting data (for ReportsController graphs)
  #
  ###

  include Mongoid::Document
  include Mongoid::Timestamps

  ## Names of defined reports
  STUDY_COUNTS = {
    name: 'study_counts',
    proc: Proc.new { SummaryStatsUtils.study_counts }
  }
  WEEKLY_RETURNING_USERS = {
    name: 'Weekly Returning Users',
    proc: Proc.new { SummaryStatsUtils.weekly_returning_users }
  }

  field :name, type: String
  field :date, type: DateTime
  field :value, type: Hash

  validates_presence_of :name, :date, :value

  after_save :do_record_change_update
  after_destroy :do_record_change_update

  index({name: 1})

  @@latest_reports = {}

  # when a ReportTimePoint changes, refresh the latest_reports cache for that report name
  def do_record_change_update
    ReportTimePoint.update_latest_report(self.name)
  end

  # updates the latest_reports hash by doing a fresh query for the report of the given name
  def self.update_latest_report(report_name)
    @@latest_reports[report_name] = ReportTimePoint.where(name: report_name).order(date: 'DESC').first
  end

  # attempts to get the most recent report of the given name from a cache, before fetching it fresh from the DB, or regenerating it
  # example: ReportTimePoint.get_latest_report(ReportTimePoint::STUDY_COUNTS, 2.days)
  # will look for the most recent study_counts report that is less than 2 days old.  If it isn't found,
  # it will generate a new report
  def self.get_latest_report(report, max_age=1.day, create_if_absent=true)
    report_name = report[:name]
    cutoff_time = Time.zone.now - max_age
    if !@@latest_reports[report_name] || @@latest_reports[report_name].date < cutoff_time
      # if it's not cached, refetch it from the DB
      update_latest_report(report_name)
      if (!@@latest_reports[report_name] || @@latest_reports[report_name].date < cutoff_time) &&
        create_if_absent
        # if it's not in the DB, create a new report time point
        # note that the after_save hook will take care of updating latest_reports
        ReportTimePoint.create_point(report)
      end
    end
    @@latest_reports[report_name]
  end

  # Convenience method for creating a ReportTimePoint for one of the predefined reports above
  # e.g. ReportTimePoint.create_report(ReportTimePoint::STUDY_COUNTS)
  def self.create_point(report)
    result = report[:proc].call
    ReportTimePoint.create!(name: report[:name], date: Time.zone.now, value: result)
  end
end
