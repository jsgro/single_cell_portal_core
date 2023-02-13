require "test_helper"

describe AbTestsController do
  it "must get edit" do
    get ab_tests_edit_url
    must_respond_with :success
  end

  it "must get update" do
    get ab_tests_update_url
    must_respond_with :success
  end

end
