class HeatmapFileInfo
  include Mongoid::Document

  embedded_in :study_file

  # how to color scale heatmaps from this file: row|global|manual. nil/'' will be treated as 'row'
  # if manual, `y_axis_min` and `y_axis_max` will store the range
  field :custom_scaling, type: Boolean, default: false
  field :color_min, type: Float
  field :color_max, type: Float
end