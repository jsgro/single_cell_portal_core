# main array concatenation module for both DataArray and UserDataArray classes
module Concatenatable
  extend ActiveSupport::Concern

  # main query/concatenation method for array-based data
  # will retrieve documents from database w/o incurring MongoDB sort limit errors and
  # concatenate the values together into a single contiguous array
  def concatenate_arrays(query)
    arrays = where(query)
    arr_vals = arrays.pluck(:array_index, :values)
    arr_vals = arr_vals.sort_by(&:first)
    arr_vals.reduce([]) { |aggregate, arr_val|  aggregate.concat(arr_val.last) }
  end
end
