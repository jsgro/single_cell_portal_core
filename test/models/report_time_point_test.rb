require "test_helper"

class ReportTimePointTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  def setup
    ReportTimePoint.destroy_all
  end

  test 'ReportTimePoints cache correctly' do
    test_report = ReportTimePoint::STUDY_COUNTS
    report_name = test_report[:name]
    # confirm nothing is found if create_if_absent is false
    assert_equal 0, ReportTimePoint.where(name: report_name).count
    assert_nil ReportTimePoint.get_latest_report(test_report, 1.day, false)

    # confirm the report is created if it doesn't exist and create_if_absent is true
    created_report = ReportTimePoint.get_latest_report(test_report)
    assert_equal 1, ReportTimePoint.where(name: report_name).count
    assert_equal created_report, ReportTimePoint.where(name: report_name).first

    # confirm if it is called again, the report is fetched from the cache, and not recreated
    next_result = ReportTimePoint.get_latest_report(test_report)
    assert_equal 1, ReportTimePoint.where(name: report_name).count
    assert_equal created_report, next_result

    # if the report is too old, confirm it is rerun
    ReportTimePoint.where(name: report_name).first.update!(date: 4.days.ago)
    new_result = ReportTimePoint.get_latest_report(test_report)
    assert_equal 2, ReportTimePoint.where(name: report_name).count
    assert_not_equal new_result, created_report
  end
end
