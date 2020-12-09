# helper method for tests to clean up data on teardown calls
# will remove all data associated with a study instance

# list of models to clean up data from
DATA_MODELS = [CellMetadatum, ClusterGroup, DataArray, DirectoryListing, DownloadAgreement, Gene, StudyFile, StudyFileBundle]

def delete_study_and_ensure_cascade(study)
  DATA_MODELS.each do |model|
    model.where(study_id: study.id).destroy_all
  end
  # now destroy study to ensure everything is removed
  if study.detached
    study.destroy
  else
    study.destroy_and_remove_workspace
  end
end
