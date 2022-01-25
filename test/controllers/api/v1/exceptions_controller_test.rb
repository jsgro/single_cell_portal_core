require "test_helper"

describe Api::V1::ExceptionsController do
  it "must get show" do
    get api_v1_exceptions_show_url
    must_respond_with :success
  end

end
