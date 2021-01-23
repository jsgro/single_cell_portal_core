class UserAnnotationService
  # Methods to interact with annotation data, beyond just visualization

  def self.create_user_annotation(study, name,
    user_data_arrays_attributes, cluster_name, loaded_annotation,
    subsample_threshold, subsample_annotation, current_user)

    # Parameters to log for any errors
    user_annotation_params = {
      study: study, name: name, cluster_name: cluster_name,
      loaded_annotation: loaded_annotation,
      subsample_threshold: subsample_threshold,
      subsample_annotation: subsample_annotation, current_user: current_user
    }
    log_params = user_annotation_params.dup
    # remove data_arrays attributes due to size
    log_params.delete(:user_data_arrays_attributes)

    user_id = current_user.id

    # byebug
    cluster_group_id = study.cluster_groups.find_by(name: cluster_name).id

    study_id = study[:id]

    # Data name is an array of the values of labels
    data_names = []

    begin

      # Get the label values and push to data names
      user_data_arrays_attributes.keys.each do |key|
        user_data_arrays_attributes[key][:values] =  user_data_arrays_attributes[key][:values].split(',')
        data_names.push(user_data_arrays_attributes[key][:name].strip)
      end

      source_resolution = subsample_threshold.present? ? subsample_threshold.to_i : nil

      # Create the annotation
      user_annotation = UserAnnotation.new(user_id: user_id, study_id: study_id,
                                            cluster_group_id: cluster_group_id,
                                            values: data_names, name: name,
                                            source_resolution: source_resolution)

      # override cluster setter to use the current selected cluster, needed for reloading
      cluster = user_annotation.cluster_group

      # Save the user annotation, and handle any exceptions
      if user_annotation.save
        # Method call to create the user data arrays for this annotation
        user_annotation.initialize_user_data_arrays(user_data_arrays_attributes, subsample_annotation, subsample_threshold, loaded_annotation)

        # Reset the annotations in the dropdowns to include this new annotation
        cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
        options = ClusterVizService.load_cluster_group_options(study)

        # No need for an alert, only a message saying successfully created
        alert = nil
        notice = "User Annotation: '#{user_annotation.name}' successfully saved. You may now view this annotation via the annotations dropdown."
      else
        # If there was an error saving, reload and alert the use something broke
        cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
        options = ClusterVizService.load_cluster_group_options(study)
        notice = nil
        alert = 'The following errors prevented the annotation from being saved: ' + user_annotation.errors.full_messages.join(',')
        Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, unable to save user annotation with errors #{user_annotation.errors.full_messages.join(', ')}"
      end
      [notice, alert, cluster_annotations, options]

    # Handle other errors in saving user annotation
    rescue Mongoid::Errors::InvalidValue => e
      error_context = ErrorTracker.format_extra_context(study, {params: log_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If an invalid value was somehow passed through the form, and couldn't save the annotation
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'The following errors prevented the annotation from being saved: ' + 'Invalid data type submitted. (' + e.problem + '. ' + e.resolution + ')'
      Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, invalid value of #{e.message}"
      [notice, alert, cluster_annotations, options]

    rescue NoMethodError => e
      error_context = ErrorTracker.format_extra_context(study, {params: log_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If something is nil and can't have a method called on it, respond with an alert
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'The following errors prevented the annotation from being saved: ' + e.message
      Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, no method error #{e.message}"
      [notice, alert, cluster_annotations, options]

    rescue => e
      error_context = ErrorTracker.format_extra_context(study, {params: log_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If a generic unexpected error occurred and couldn't save the annotation
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'An unexpected error prevented the annotation from being saved: ' + e.message
      Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, unexpected error #{e.message}"
      [notice, alert, cluster_annotations, options]

    end
  end
end
