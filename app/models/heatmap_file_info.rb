class HeatmapFileInfo
  include Mongoid::Document

  embedded_in :study_file

  # if custom_scaling is false, color_min/max will be ignored
  field :custom_scaling, type: Boolean, default: false
  field :color_min, type: Float
  field :color_max, type: Float
end
