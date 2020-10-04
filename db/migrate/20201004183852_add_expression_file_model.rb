class AddExpressionFileModel < Mongoid::Migration
  def self.up
    StudyFile.each do |study_file|
      type_class = StudyFile
      if study_file.file_type == 'Expression Matrix'
        type_class = ExpressionStudyFile
      end
      study_file.update(_type: type_class)
    end
  end

  def self.down
    StudyFile.each do |study_file|
      study_file.unset(:type)
      study_file.save
    end
  end
end
