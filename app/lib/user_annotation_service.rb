class UserAnnotationService
  # Methods to interact with annotation data, beyond just visualization

  def self.create_user_annotation(study, name,
    user_data_arrays_attributes, cluster_name, loaded_annotation,
    subsample_threshold, subsample_annotation, current_user)
    Rails.logger.info "**** in create_user_annotations"

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

      Rails.logger.info "**** 0"

      Rails.logger.info "user_data_arrays_attributes"
      Rails.logger.info user_data_arrays_attributes

      # Get the label values and push to data names
      user_data_arrays_attributes.keys.each do |key|
        Rails.logger.info "key"
        Rails.logger.info key
        user_data_arrays_attributes[key][:values] =  user_data_arrays_attributes[key][:values].split(',')
        data_names.push(user_data_arrays_attributes[key][:name].strip)
      end

      source_resolution = subsample_threshold.present? ? subsample_threshold.to_i : nil

      Rails.logger.info "**** 1"

      # Create the annotation
      user_annotation = UserAnnotation.new(user_id: user_id, study_id: study_id,
                                            cluster_group_id: cluster_group_id,
                                            values: data_names, name: name,
                                            source_resolution: source_resolution)

      Rails.logger.info "**** 2"

      # override cluster setter to use the current selected cluster, needed for reloading
      cluster = user_annotation.cluster_group

      Rails.logger.info "**** 3"
      Rails.logger.info "user_annotation"
      Rails.logger.info user_annotation
      Rails.logger.info "user_annotation.to_yaml"
      Rails.logger.info user_annotation.to_yaml

      # Save the user annotation, and handle any exceptions
      if user_annotation.save
        Rails.logger.info "**** in create_user_annotations, @user_annotation.save === true"
        # Method call to create the user data arrays for this annotation
        user_annotation.initialize_user_data_arrays(user_data_arrays_attributes, subsample_annotation, subsample_threshold, loaded_annotation)

        # Reset the annotations in the dropdowns to include this new annotation
        cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
        options = ClusterVizService.load_cluster_group_options(study)

        # No need for an alert, only a message saying successfully created
        alert = nil
        notice = "User Annotation: '#{user_annotation.name}' successfully saved. You may now view this annotation via the annotations dropdown."

        # Update the dropdown partial
        return [notice, alert]
      else
        Rails.logger.info "**** in create_user_annotations, @user_annotation.save === false"
        # If there was an error saving, reload and alert the use something broke
        cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
        options = ClusterVizService.load_cluster_group_options(study)
        notice = nil
        alert = 'The following errors prevented the annotation from being saved: ' + user_annotation.errors.full_messages.join(',')
        Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, unable to save user annotation with errors #{user_annotation.errors.full_messages.join(', ')}"
        return [notice, alert]
      end

    # Handle other errors in saving user annotation
    rescue Mongoid::Errors::InvalidValue => e
      puts "**** in create_user_annotations, Mongoid::Errors"
      error_context = ErrorTracker.format_extra_context(study, {params: log_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If an invalid value was somehow passed through the form, and couldn't save the annotation
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'The following errors prevented the annotation from being saved: ' + 'Invalid data type submitted. (' + e.problem + '. ' + e.resolution + ')'
      Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, invalid value of #{e.message}"
      return [notice, alert]

    rescue NoMethodError => e
      puts "**** in create_user_annotations, NoMethodError"
      error_context = ErrorTracker.format_extra_context(study, {params: log_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If something is nil and can't have a method called on it, respond with an alert
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'The following errors prevented the annotation from being saved: ' + e.message
      Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, no method error #{e.message}"
      return [notice, alert]

    rescue => e
      puts "**** in create_user_annotations, e"
      error_context = ErrorTracker.format_extra_context(study, {params: log_params})
      ErrorTracker.report_exception(e, current_user, error_context)
      # If a generic unexpected error occurred and couldn't save the annotation
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
      options = ClusterVizService.load_cluster_group_options(study)
      notice = nil
      alert = 'An unexpected error prevented the annotation from being saved: ' + e.message
      Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, unexpected error #{e.message}"
      return [notice, alert]
    end
  end
end
