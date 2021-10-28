# main array concatenation module for both DataArray and UserDataArray classes
module Concatenatable
  extend ActiveSupport::Concern

  # main query/concatenation method for array-based data
  # will retrieve documents from database w/o incurring MongoDB sort limit errors and
  # concatenate the values together into a single contiguous array
  def concatenate_arrays(query)
    arrays = where(query)
    ids = arrays.pluck(:id, :array_index).sort_by(&:last).map(&:first)
    ids.map { |id| find(id).values }.reduce([], :+)
  end
end
