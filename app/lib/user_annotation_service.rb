class UserAnnotationService
  # Methods to interact with annotation data, beyond just visualization

  # Create new custom user annotation
  #
  # * *params*
  #   - (Study) study Object for current study
  #   - (String) name Name of new user annotation
  #   - (Object) user_data_arrays_attributes Labels (names) and cell name
  #       arrays (values) for each selection
  #   - (String) cluster_name Name of loaded cluster
  #   - (String) loaded_annotation Three-part name of loaded annotation
  #   - (String) subsample_threshold Value of subsampling threshold
  #   - (Object) current_user Object for current user
  # * *return*
  #   - (Object) cluster_annotations Updated annotations object
  def self.create_user_annotation(study, name,
    user_data_arrays_attributes, cluster_name, loaded_annotation,
    subsample_threshold, current_user)

    # Parameters to log for any errors
    user_annotation_params = {
      study: study, name: name, cluster_name: cluster_name,
      loaded_annotation: loaded_annotation,
      subsample_threshold: subsample_threshold,
      current_user: current_user
    }

    user_id = current_user.id
    cluster_group_id = study.cluster_groups.find_by(name: cluster_name).id

    # Data name is an array of the values of labels
    data_names = []
    # Get the label values and push to data names
    user_data_arrays_attributes.keys.each do |key|
      data_names.push(user_data_arrays_attributes[key][:name].strip)
    end
    source_resolution = subsample_threshold.present? ? subsample_threshold.to_i : nil

    # Create the annotation
    user_annotation = UserAnnotation.new(
      user_id: user_id, study_id: study[:id],
      cluster_group_id: cluster_group_id,
      values: data_names, name: name,
      source_resolution: source_resolution)

    # override cluster setter to use the current selected cluster, needed for
    # reloading
    cluster = user_annotation.cluster_group

    # Save the user annotation, and handle any exceptions
    begin
      user_annotation.save!

      # Consider refactoring user_annotation_test.rb and
      # models/user_annotation.rb to remove `subsample_annotation`.  Jon
      # and Eric investigated on 2021-01-22 and determined that there are no
      # known use cases where `subsample_annotation` != `loaded_annotation`.
      subsample_annotation = loaded_annotation

      # Method call to create the user data arrays for this annotation
      user_annotation.initialize_user_data_arrays(
        user_data_arrays_attributes, subsample_annotation, subsample_threshold,
        loaded_annotation
      )

      # Reset the annotations in the dropdowns to include this new annotation
      cluster_annotations = ClusterVizService.load_cluster_group_annotations(
        study, cluster, current_user
      )

      cluster_annotations

    # Handle errors.  In service classes like this, we:
    #   * Log to the local VM via Rails.logger.error
    #   * Don't log to third-parties like Sentry, e.g.
    #     don't call ErrorTracker.report_exception
    #   * Transform implementation-specific errors (e.g.Mongoid::Foo::Bar)
    #     to generic errors (e.g. ArgumentError)
    rescue Mongoid::Errors::InvalidValue => e
      Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, invalid value of #{e.message}"
      message =
        'The following errors prevented the annotation from being saved: ' +
        'Invalid data type submitted. (' + e.problem + '. ' + e.resolution + ')'
      raise ArgumentError, message
    rescue Mongoid::Errors::Validations => e
      # Handle common known user errrors due to invalid input;
      # and raise general exception for others
      if e.summary.include? 'Name' and e.summary.include? 'has already been taken'
        Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, user error #{e.summary}"
        message =
          'An annotation with the name you provided ("' + name + '") already exists.  ' +
          'Please name your annotation something different.'
        raise ArgumentError, message
      else
        Rails.logger.error "Unhandled validation error when creating user annotation, using params: #{user_annotation_params}, user error #{e.summary}"
        raise e
      end
    end
  end
end
