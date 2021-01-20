class AnnotationService
  # Methods to interact with annotation data, beyond just visualization
  def self.create_annotation(study, name, user_id, cluster_group_id,
    subsample_threshold, loaded_annotation, subsample_annotation,
    user_data_arrays_attributes)
    Rails.logger.info "**** in create_user_annotations"

    study_id = study[:id]

    # Data name is an array of the values of labels
    data_names = []

    #Error handling block to create annotation
    begin

      # Get the label values and push to data names
      user_data_arrays_attributes.keys.each do |key|
        user_data_arrays_attributes[key][:values] =  user_data_arrays_attributes[key][:values].split(',')
        data_names.push(user_data_arrays_attributes[key][:name].strip)
      end

      source_resolution = subsample.present? ? subsample.to_i : nil

      # Create the annotation
      user_annotation = UserAnnotation.new(user_id: user_id, study_id: study_id,
                                            cluster_group_id: cluster_group_id,
                                            values: data_names, name: name,
                                            source_resolution: source_resolution)

      # override cluster setter to use the current selected cluster, needed for reloading
      cluster = user_annotation.cluster_group

      # Error handling, save the annotation and handle exceptions
      if user_annotation.save
        puts "**** in create_user_annotations, @user_annotation.save === true"
        # Method call to create the user data arrays for this annotation
        user_annotation.initialize_user_data_arrays(user_data_arrays_attributes, subsample_annotation, subsample, loaded_annotation)

        # Reset the annotations in the dropdowns to include this new annotation
        cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
        options = ClusterVizService.load_cluster_group_options(study)

        # No need for an alert, only a message saying successfully created
        alert = nil
        notice = "User Annotation: '#{user_annotation.name}' successfully saved. You may now view this annotation via the annotations dropdown."

        # Update the dropdown partial
        render 'update_user_annotations'
      else
        puts "**** in create_user_annotations, @user_annotation.save === false"
        # If there was an error saving, reload and alert the use something broke
        cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
        options = ClusterVizService.load_cluster_group_options(study)
        notice = nil
        alert = 'The following errors prevented the annotation from being saved: ' + user_annotation.errors.full_messages.join(',')
        logger.error "Creating user annotation of params: #{user_annotation_params}, unable to save user annotation with errors #{user_annotation.errors.full_messages.join(', ')}"
        render 'update_user_annotations'
      end
        # More error handling, this is if can't save user annotation
    rescue Mongoid::Errors::InvalidValue => e
      puts "**** in create_user_annotations, Mongoid::Errors"
      sanitized_params = user_annotation_params.dup
      sanitized_params.delete(:user_data_arrays_attributes) # remove data_arrays attributes due to size
      error_context = ErrorTracker.format_extra_context(study, {params: sanitized_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If an invalid value was somehow passed through the form, and couldn't save the annotation
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'The following errors prevented the annotation from being saved: ' + 'Invalid data type submitted. (' + e.problem + '. ' + e.resolution + ')'
      logger.error "Creating user annotation of params: #{user_annotation_params}, invalid value of #{e.message}"
      render 'update_user_annotations'

    rescue NoMethodError => e
      puts "**** in create_user_annotations, NoMethodError"
      sanitized_params = user_annotation_params.dup
      sanitized_params.delete(:user_data_arrays_attributes) # remove data_arrays attributes due to size
      error_context = ErrorTracker.format_extra_context(study, {params: sanitized_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If something is nil and can't have a method called on it, respond with an alert
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'The following errors prevented the annotation from being saved: ' + e.message
      logger.error "Creating user annotation of params: #{user_annotation_params}, no method error #{e.message}"
      render 'update_user_annotations'

    rescue => e
      puts "**** in create_user_annotations, e"
      sanitized_params = user_annotation_params.dup
      sanitized_params.delete(:user_data_arrays_attributes) # remove data_arrays attributes due to size
      error_context = ErrorTracker.format_extra_context(study, {params: sanitized_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If a generic unexpected error occurred and couldn't save the annotation
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'An unexpected error prevented the annotation from being saved: ' + e.message
      logger.error "Creating user annotation of params: #{user_annotation_params}, unexpected error #{e.message}"
      render 'update_user_annotations'
    end
  end
end
