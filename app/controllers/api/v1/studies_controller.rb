module Api
  module V1
    class StudiesController < ApiBaseController
      include Concerns::FireCloudStatus

      def firecloud_independent_methods
        # add file_info is essentially a more extensive 'show' method
        [:index, :show, :file_info]
      end

      before_action :authenticate_api_user!
      before_action :set_study, except: [:index, :create]
      before_action :check_study_permission, except: [:index, :create, :generate_manifest]
      before_action :check_study_view_permission, only: [:generate_manifest]

      respond_to :json

      SUPPORTED_LABEL_FONTS = ['Helvetica Neue', 'Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Trebuchet MS', 'Impact']

      swagger_path '/studies' do
        operation :get do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Find all Studies'
          key :description, 'Returns all Studies editable by the current user'
          key :operationId, 'studies_path'
          response 200 do
            key :description, 'Array of Study objects'
            schema do
              key :type, :array
              key :title, 'Array'
              items do
                key :title, 'Study'
                key :'$ref', :Study
              end
            end
          end
          response 401 do
            key :description, ApiBaseController.unauthorized
          end
          response 406 do
            key :description, ApiBaseController.not_acceptable
          end
        end
      end

      # GET /single_cell/api/v1/studies
      def index
        @studies = Study.editable(current_api_user)
        study_owner_ids = @studies.pluck(:id, :user_id)
        user_info = User.where(:id.in => study_owner_ids.map{ |a| a[1] }).pluck(:id, :email)
        # create a hash of study_id => owner email
        @study_owner_emails = study_owner_ids.reduce({}) do |hash, study_owner_id|
          hash[study_owner_id[0].to_s] = user_info.find { |user| user[0] == study_owner_id[1] }[1]
          hash
        end

      end

      swagger_path '/studies/{id}' do
        operation :get do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Find a Study'
          key :description, 'Finds a single Study'
          key :operationId, 'study_path'
          parameter do
            key :name, :id
            key :in, :path
            key :description, 'ID of Study to fetch'
            key :required, true
            key :type, :string
          end
          response 200 do
            key :description, 'Study object'
            schema do
              key :title, 'Study'
              key :'$ref', :Study
            end
          end

          response 403 do
            key :description, ApiBaseController.forbidden('edit Study')
          end
          extend SwaggerResponses::StudyControllerResponses
        end
      end

      # GET /single_cell/api/v1/studies/:id
      def show
      end

      def usage_stats
        usage_stats_params = {
          page_views: {
            event: 'page:view:site-study',
            type: 'unique',
            where_string: "properties[\"studyAccession\"] == \"#{@study.accession}\""
          },
          file_downloads: {
            event: 'click:link',
            type: 'general',
            where_string: "properties[\"studyAccession\"] == \"#{@study.accession}\" and properties[\"text\"] == \"file-download:study-single\""
          },
          bulk_downloads: {
            event: 'file-download:curl-config',
            type: 'general',
            where_string: "\"#{@study.accession}\" in properties[\"studyAccessions\"]"
          }
        }

        responses = Parallel.map(usage_stats_params.keys) do |key|
          response = MixpanelClient.fetch_segmentation_query(usage_stats_params[key])
        end
        usage_stats = {}
        usage_stats_params.keys.each_with_index do |key, index|
          usage_stats[key] = responses[index]
        end

        render json: usage_stats
      end

      # return JSON of the study, all study file objects, and any options values needed for the upload wizard
      # also includes feature flags, with study flags taking precedence over user flags
      swagger_path '/studies/{id}/file_info' do
        operation :get do
          key :tags, [
            'Studies'
          ]
          key :summary, 'Get Study info'
          key :description, 'Gets attribute, file, feature flag, and configuration information about a single Study'
          key :operationId, 'study_file_info_path'
          parameter do
            key :name, :id
            key :in, :path
            key :description, 'ID of Study to fetch'
            key :required, true
            key :type, :string
          end
          response 200 do
            schema do
              property :study do
                key :description, 'Study object'
                key :title, 'Study'
                key :'$ref', :Study
              end
              property :files do
                key :type, :array
                key :title, 'Array<StudyFile>'
                items do
                  key :'$ref', :StudyFile
                end
              end
              property :feature_flags do
                key :type, :object
                key :title, 'FeatureFlagOptions'
                key :description, 'Hash of FeatureFlagOption values with defaults, e.g. flag_name => flag_value'
              end
              property :menu_options do
                key :type, :object
                key :title, 'MenuOptions'
                key :description, 'Hash of select menu options for various views'
                property :fonts do
                  key :type, :array
                  items do
                    key :type, :string
                  end
                end
                property :species do
                  key :type, :array
                  items do
                    key :type, :object
                    key :title, 'Species information'
                    property :id do
                      key :type, :string
                    end
                    property :common_name do
                      key :type, :string
                    end
                  end
                end
                property :units do
                  key :type, :array
                  items do
                    key :type, :string
                    key :enum, ExpressionFileInfo::UNITS_VALUES
                  end
                end
                property :library_preparation_protocol do
                  key :type, :array
                  items do
                    key :type, :string
                    key :enum, ExpressionFileInfo::LIBRARY_PREPARATION_VALUES
                  end
                end
                property :modality do
                  key :type, :array
                  items do
                    key :type, :string
                    key :enum, ExpressionFileInfo::MODALITY_VALUES
                  end
                end
                property :biosample_input_type do
                  key :type, :array
                  items do
                    key :type, :string
                    key :enum, ExpressionFileInfo::BIOSAMPLE_INPUT_TYPE_VALUES
                  end
                end
                property :sequence_file_types do
                  key :type, :array
                  items do
                    key :type, :string
                    key :enum, %w[Fastq BAM]
                  end
                end
                property :genome_assemblies do
                  key :type, :array
                  items do
                    key :type, :object
                    key :title, 'GenomeAssembly'
                    property :id do
                      key :type, :string
                    end
                    property :name do
                      key :type, :string
                    end
                    # show ID of associated parent Taxon for storing belongs_to association
                    property :taxon_id do
                      key :type, :string
                    end
                  end
                end
              end
            end
          end

          response 403 do
            key :description, ApiBaseController.forbidden('edit Study')
          end
          extend SwaggerResponses::StudyControllerResponses
        end
      end

      def file_info
        response_obj = {
          study: @study.attributes,
          files: @study.study_files,
          feature_flags: FeatureFlaggable.feature_flags_for_instances(current_api_user, @study)
        }
        if params[:include_options]
          response_obj[:menu_options] = {
            fonts: SUPPORTED_LABEL_FONTS,
            species: ActiveRecordUtils.pluck_to_hash(Taxon.sorted, [:id, :common_name])
              .map { |k| k[:id] = k[:id].to_s; k }, # return the hash but with ids converted to strings
            units: ExpressionFileInfo::UNITS_VALUES,
            library_preparation_protocol: ExpressionFileInfo::LIBRARY_PREPARATION_VALUES,
            modality: ExpressionFileInfo::MODALITY_VALUES,
            biosample_input_type: ExpressionFileInfo::BIOSAMPLE_INPUT_TYPE_VALUES,
            sequence_file_types: ['Fastq', 'BAM'],
            genome_assemblies: ActiveRecordUtils.pluck_to_hash(GenomeAssembly, [:id, :name, :taxon_id])
              .map do |k| # return the hash but with ids converted to strings
                k[:id] = k[:id].to_s
                k[:taxon_id] = k[:taxon_id].to_s;
                k
              end
          }
        end
        render json: response_obj
      end

      swagger_path '/studies' do
        operation :post do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Create a Study'
          key :description, 'Creates and returns a single Study'
          key :operationId, 'create_study_path'
          parameter do
            key :name, :study
            key :in, :body
            key :description, 'Study object'
            key :required, true
            schema do
              key :'$ref', :StudyInput
            end
          end
          response 200 do
            key :description, 'Successful creation of Study object'
            schema do
              key :title, 'Study'
              key :'$ref', :Study
            end
          end
          response 403 do
            key :description, ApiBaseController.forbidden('edit Study')
          end
          extend SwaggerResponses::StudyControllerResponses
          extend SwaggerResponses::ValidationFailureResponse
        end
      end

      # POST /single_cell/api/v1/studies
      def create
        @study = Study.new(study_params)
        @study.user = current_api_user # automatically set user from credentials


        if @study.save
          render :show
        else
          render json: {errors: @study.errors}, status: :unprocessable_entity
        end
      end

      swagger_path '/studies/{id}' do
        operation :patch do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Update a Study'
          key :description, 'Updates and returns a single Study.  FireCloud project/workspace attributes cannot be changed.'
          key :operationId, 'update_study_path'
          parameter do
            key :name, :id
            key :in, :path
            key :description, 'ID of Study to update'
            key :required, true
            key :type, :string
          end
          parameter do
            key :name, :study
            key :in, :body
            key :description, 'Study object'
            key :required, true
            schema do
              key :'$ref', :StudyUpdateInput
            end
          end
          response 200 do
            key :description, 'Successful update of Study object'
            schema do
              key :title, 'Study'
              key :'$ref', :Study
            end
          end
          response 403 do
            key :description, ApiBaseController.forbidden('edit Study')
          end
          extend SwaggerResponses::StudyControllerResponses
          extend SwaggerResponses::ValidationFailureResponse
        end
      end

      # PATCH /single_cell/api/v1/studies/:id
      def update
        if @study.update(study_params)
          if @study.previous_changes.keys.include?('name')
            # if user renames a study, invalidate all visualization caches and repopulate default cache
            CacheRemovalJob.new(@study.accession).perform
            ClusterCacheService.delay(queue: :cache).cache_study_defaults(@study)
          end
          render :show
        else
          render json: {errors: @study.errors}, status: :unprocessable_entity
        end
      end

      swagger_path '/studies/{id}' do
        operation :delete do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Delete a Study'
          key :description, 'Deletes a single Study'
          key :operationId, 'delete_study_path'
          parameter do
            key :name, :id
            key :in, :path
            key :description, 'ID of Study to delete'
            key :required, true
            key :type, :string
          end
          parameter do
            key :name, :workspace
            key :in, :query
            key :description, 'Keep FireCloud workspace after study deletion?'
            key :required, false
            key :type, :string
            key :enum, ['persist']
          end
          response 204 do
            key :description, 'Successful Study deletion'
          end
          extend SwaggerResponses::StudyControllerResponses
          response 403 do
            key :description, ApiBaseController.forbidden('delete Study')
          end
        end
      end

      # DELETE /single_cell/api/v1/studies/:id
      def destroy
        # check if user is allowed to delete study
        if @study.can_delete?(current_api_user)
          # set queued_for_deletion manually - gotcha due to race condition on page reloading and how quickly delayed_job can process jobs
          @study.update(queued_for_deletion: true)

          if params[:workspace] == 'persist'
            @study.update(firecloud_workspace: nil)
          else
            begin
              ApplicationController.firecloud_client.delete_workspace(@study.firecloud_project, @study.firecloud_workspace)
            rescue => e
              ErrorTracker.report_exception(e, current_api_user, @study, params.to_unsafe_hash)
              MetricsService.report_error(e, request, current_api_user, @study)
              logger.error "Unable to delete workspace: #{@study.firecloud_workspace}; #{e.message}"
              render json: {error: "Error deleting FireCloud workspace #{@study.firecloud_project}/#{@study.firecloud_workspace}: #{e.message}"}, status: 500
            end
          end

          # queue jobs to delete study caches & study itself
          CacheRemovalJob.new(@study.accession).delay(queue: :cache).perform
          DeleteQueueJob.new(@study).delay.perform

          # revoke all study_shares
          @study.study_shares.delete_all

          head 204
        else
          head 403
        end
      end

      swagger_path '/studies/{id}/sync' do
        operation :post do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Sync a Study'
          key :description, 'Synchronize a single Study against its FireCloud workspace & GCS bucket'
          key :operationId, 'sync_study_path'
          parameter do
            key :name, :id
            key :in, :path
            key :description, 'ID of Study to sync'
            key :required, true
            key :type, :string
          end
          response 200 do
            key :description, 'StudyShares, StudyFiles, and DirectoryListings'
            schema do
              key :title, 'JSON object of StudyShares, StudyFiles, and DirectoryListings'
              property :study_shares do
                key :type, :array
                key :title, 'StudyShare array'
                items do
                  key :title, 'StudyShare'
                  key :'$ref', :StudyShare
                end
              end
              property :study_files do
                key :type, :object
                key :title, 'JSON object of synced, unsynced, and orphaned StudyFiles'
                property :unsynced do
                  key :title, 'Unsynced StudyFile array'
                  key :type, :array
                  items do
                    key :title, 'StudyFile'
                    key :'$ref', :StudyFile
                  end
                end
                property :synced do
                  key :title, 'Synced StudyFile array'
                  key :type, :array
                  items do
                    key :title, 'StudyFile'
                    key :'$ref', :StudyFile
                  end
                end
                property :orphaned do
                  key :title, 'Orphaned StudyFile array'
                  key :type, :array
                  items do
                    key :title, 'StudyFile'
                    key :'$ref', :StudyFile
                  end
                end
              end
              property :directory_listings do
                key :type, :object
                key :title, 'JSON object of synced and unsynced DirectoryListings'
                property :unsynced do
                  key :type, :array
                  key :title, 'Unsynced DirectoryListing array'
                  items do
                    key :title, 'DirectoryListing'
                    key :'$ref', :DirectoryListing
                  end
                end
                property :synced do
                  key :type, :array
                  key :title, 'Synced DirectoryListing array'
                  items do
                    key :title, 'DirectoryListing'
                    key :'$ref', :DirectoryListing
                  end
                end
              end
            end
          end
          response 403 do
            key :description, ApiBaseController.forbidden('edit Study')
          end
          extend SwaggerResponses::StudyControllerResponses
          response 500 do
            key :description, 'Server error when attempting to synchronize FireCloud workspace or access GCS objects'
          end
        end
      end

      def sync_study
        @study_files = @study.study_files.valid
        @study_files.each {|study_file| study_file.build_expression_file_info if study_file.expression_file_info.nil?}
        @directories = @study.directory_listings.to_a
        # keep a list of what we expect to be
        @files_by_dir = {}
        @synced_study_files = []
        @synced_directories = []
        @unsynced_files = []
        @unsynced_directories = @study.directory_listings.unsynced
        @permissions_changed = []

        # get a list of workspace submissions so we know what directories to ignore
        @submission_ids = ApplicationController.firecloud_client.get_workspace_submissions(@study.firecloud_project, @study.firecloud_workspace).map {|s| s['submissionId']}

        # first sync permissions if necessary
        begin
          portal_permissions = @study.local_acl
          firecloud_permissions = ApplicationController.firecloud_client.get_workspace_acl(@study.firecloud_project, @study.firecloud_workspace)
          firecloud_permissions['acl'].each do |user, permissions|
            # skip project owner permissions, they aren't relevant in this context
            # also skip the readonly service account
            if permissions['accessLevel'] =~ /OWNER/i || (ApplicationController.read_only_firecloud_client.present? && user == ApplicationController.read_only_firecloud_client.issuer)
              next
            else
              # determine whether permissions are incorrect or missing completely
              if !portal_permissions.has_key?(user)
                new_share = @study.study_shares.build(email: user,
                                                      permission: StudyShare::PORTAL_ACL_MAP[permissions['accessLevel']],
                                                      firecloud_project: @study.firecloud_project,
                                                      firecloud_workspace: @study.firecloud_workspace,

                                                      )
                # skip validation as we don't wont to set the acl in FireCloud as it already exists
                new_share.save(validate: false)
                @permissions_changed << new_share
              elsif portal_permissions[user] != StudyShare::PORTAL_ACL_MAP[permissions['accessLevel']] && user != @study.user.email
                # share exists, but permissions are wrong
                share = @study.study_shares.detect {|s| s.email == user}
                share.update(permission: StudyShare::PORTAL_ACL_MAP[permissions['accessLevel']])
                @permissions_changed << share
              else
                # permissions are correct, skip
                next
              end
            end
          end

          # now check to see if there have been permissions removed in FireCloud that need to be removed on the portal side
          new_study_permissions = @study.study_shares.to_a
          new_study_permissions.each do |share|
            if firecloud_permissions['acl'][share.email].nil?
              logger.info "#{Time.zone.now}: removing #{share.email} access to #{@study.name} via sync - no longer in FireCloud acl"
              share.delete
            end
          end
        rescue => e
          logger.error "#{Time.zone.now}: error syncing ACLs in workspace bucket #{@study.firecloud_workspace} due to error: #{e.message}"
          render json: {error: "Unable to sync with workspace ACL: #{view_context.simple_format(e.message)}"}, status: 500
        end

        # begin determining sync status with study_files and primary or other data
        begin
          # create a map of file extension to use for creating directory_listings of groups of 10+ files of the same type
          @file_extension_map = {}
          workspace_files = ApplicationController.firecloud_client.execute_gcloud_method(:get_workspace_files, 0, @study.bucket_id)
          # see process_workspace_bucket_files in private methods for more details on syncing
          process_workspace_bucket_files(workspace_files)
          while workspace_files.next?
            workspace_files = workspace_files.next
            process_workspace_bucket_files(workspace_files)
          end
        rescue => e
          ErrorTracker.report_exception(e, current_api_user, @study, params.to_unsafe_hash)
          MetricsService.report_error(e, request, current_api_user, @study)
          logger.error "Error syncing files in workspace bucket #{@study.firecloud_workspace} due to error: #{e.message}"
          render json: {error: "Unable to sync with workspace bucket: #{view_context.simple_format(e.message)}"}, status: 500
        end

        files_to_remove = []

        # before saving unsynced directories, make a pass to check if there were any files that ended up as study_files
        # that should have been in a directory (might happen due to cutoff in files.next when iterating)
        @unsynced_files.each do |study_file|
          file_ext = DirectoryListing.file_extension(study_file.name)
          directory = DirectoryListing.get_folder_name(study_file.name)
          # check unsynced directories first, then existing directories
          existing_dir = (@unsynced_directories + @directories).detect {|dir| dir.name == directory && dir.file_type == file_ext}
          if !existing_dir.nil?
            # we have a matching directory, so that means this file should be added to it
            file_entry = {'name' => study_file.name, 'size' => study_file.upload_file_size, 'generation' => study_file.generation}
            files_to_remove << study_file.generation
            unless existing_dir.files.include?(file_entry)
              existing_dir.files << file_entry
            end
          end
        end

        # now remove files that we found that were supposed to be in directory_listings
        @unsynced_files.delete_if {|file| files_to_remove.include?(file.generation)}

        # now check against latest list of files by directory vs. what was just found to see if we are missing anything and
        # add directory to unsynced list. also check if an existing directory is now 'orphaned' because it was moved and
        # store that reference for removal after the check is complete
        orphaned_directories = []
        @directories.each do |directory|
          synced = true
          if @files_by_dir[directory.name].present?
            directory.files.each do |file|
              if @files_by_dir[directory.name].detect {|f| f['generation'].to_s == file['generation'].to_s}.nil?
                synced = false
                directory.files.delete(file)
              else
                next
              end
            end
            # if no longer synced, check if already in the list and remove as files list has changed
            if !synced
              @unsynced_directories.delete_if {|dir| dir.name == directory.name}
              @unsynced_directories << directory
            elsif directory.sync_status
              @synced_directories << directory
            end
          else
            # directory did not exist in @files_by_dir, so this directory_listing is orphaned and should be removed
            orphaned_directories << directory
          end
        end

        # remove orphaned directories
        orphaned_directories.each do |orphan|
          orphan.destroy
        end

        # provisionally save unsynced directories so we don't have to pass huge arrays of filenames/sizes in the form
        # users clicking "don't sync" actually delete entries
        @unsynced_directories.each do |directory|
          directory.save
        end

        # reload unsynced directories to remove any that were orphaned
        @unsynced_directories = @study.directory_listings.unsynced

        # split directories into primary data types and 'others'
        @unsynced_primary_data_dirs = @unsynced_directories.select {|dir| DirectoryListing::PRIMARY_DATA_TYPES.include?(dir.file_type)}
        @unsynced_other_dirs = @unsynced_directories.select {|dir| !DirectoryListing::PRIMARY_DATA_TYPES.include?(dir.file_type)}

        # now determine if we have study_files that have been 'orphaned' (cannot find a corresponding bucket file)
        @orphaned_study_files = @study_files - @synced_study_files
        @available_files = @unsynced_files.map {|f| {name: f.name, generation: f.generation, size: f.upload_file_size}}

        # now remove any 'bundled' files from @synced_study_files so we can render them inside their parent file's form
        bundled_file_ids = @study.study_file_bundles.map {|bundle| bundle.bundled_files.to_a.map(&:id)}.flatten
        @synced_study_files.delete_if {|file| bundled_file_ids.include?(file.id)}
      end

      swagger_path '/studies/{id}/manifest' do
        operation :post do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Get a study manifest file'
          key :description, 'Return a file summarizing the study and each of the files within it'
          key :operationId, 'generate_manifest'
          parameter do
            key :name, :id
            key :in, :path
            key :description, 'ID of study to generate manifest'
            key :required, true
            key :type, :string
          end
          parameter do
            key :name, :include_dirs
            key :in, :query
            key :description, 'Include directory listings in manifest'
            key :required, false
            key :type, :string
          end
          response 200 do
            key :description, 'Manifest file'
            schema do
              key :title, 'JSON object of study and study file'
              # Once file format is finalized, complete this documentation
            end
          end
          response 401 do
            key :description, ApiBaseController.unauthorized
          end
          response 403 do
            key :description, ApiBaseController.forbidden('View Study')
          end
          response 404 do
            key :description, ApiBaseController.not_found(Study)
          end
          response 410 do
            key :description, ApiBaseController.resource_gone
          end
          response 406 do
            key :description, ApiBaseController.not_acceptable
          end
          response 500 do
            key :description, 'Server error when attempting to generate study manifest'
          end
        end
      end

      def generate_manifest
        include_dirs = params[:include_dirs] == 'true'
        manifest_obj = BulkDownloadService.generate_study_files_tsv(@study, include_dirs)
        response.headers['Content-Disposition'] = 'attachment; filename=file_supplemental_info.tsv'
        render plain: manifest_obj
      end

      private

      def set_study
        # enable either id or accession as url param
        @study = Study.any_of({accession: params[:id]},{id: params[:id]}).first
        if @study.nil? || @study.queued_for_deletion?
          head 404 and return
        elsif @study.detached?
          head 410 and return
        end
      end

      def check_study_permission
        head 403 unless @study.can_edit?(current_api_user)
      end

      # checks the view permissions, either for the current_api_user or a totat, if given
      def check_study_view_permission
        head 403 unless (@study.public || @study.can_view?(current_api_user))
      end

      # study params list
      def study_params
        params.require(:study).permit(:name, :description, :public, :embargo, :use_existing_workspace, :firecloud_workspace,
                                      :firecloud_project, :cell_count, :gene_count, :view_order,  branding_group_ids: [],
                                      study_shares_attributes: [:id, :_destroy, :email, :permission],
                                      study_detail_attributes: [:id, :full_description],
                                      :default_options => [:cluster, :annotation, :color_profile, :expression_label, :deliver_emails,
                                                           :cluster_point_size, :cluster_point_alpha, :cluster_point_border],
                                      external_resources_attributes: [:id, :_destroy, :title, :description, :url, :publication_url],
                                      authors_attributes: [:id, :first_name, :last_name, :institution, :corresponding, :_destroy],
                                      publications_attributes: [:id, :title, :journal, :citation, :url, :pmcid, :preprint, :_destroy])
      end

      # sub-method to iterate through list of GCP bucket files and build up necessary sync list objects
      def process_workspace_bucket_files(files)
        # first mark any files that we already know are study files that haven't changed (can tell by generation tag)
        files_to_remove = []
        files.each do |file|
          # first, check if file is in a submission directory, and if so mark it for removal from list of files to sync
          # also ignore any files in the parse_logs folder
          base_dir = file.name.split('/').first
          if @submission_ids.include?(base_dir) || base_dir == 'parse_logs' || file.name.end_with?('/')
            files_to_remove << file.generation
          else
            directory_name = DirectoryListing.get_folder_name(file.name)
            found_file = {'name' => file.name, 'size' => file.size, 'generation' => file.generation}
            # don't add directories to files_by_dir
            unless file.name.end_with?('/')
              # add to list of discovered files
              @files_by_dir[directory_name] ||= []
              @files_by_dir[directory_name] << found_file
            end
            found_study_file = @study_files.detect {|f| f.generation.to_i == file.generation }
            if found_study_file
              @synced_study_files << found_study_file
              files_to_remove << file.generation
            end
          end
        end

        # remove files from list to process
        files.delete_if {|f| files_to_remove.include?(f.generation)}

        # next update map of existing files to determine what can be grouped together in a directory listing
        @file_extension_map = DirectoryListing.create_extension_map(files, @file_extension_map)

        files.each do |file|
          # check first if file type is in file map in a group larger than 10 (or 20 for text files)
          file_type = DirectoryListing.file_type_from_extension(file.name)
          directory_name = DirectoryListing.get_folder_name(file.name)
          if @file_extension_map.has_key?(directory_name) && !@file_extension_map.dig(directory_name, file_type).nil? &&
            @file_extension_map.dig(directory_name, file_type) >= DirectoryListing::MIN_SIZE &&
            # for the root directory, only put sequence files in a block
            (directory_name != '/' || DirectoryListing::PRIMARY_DATA_TYPES.include?(file_type))
            process_directory_listing_file(file, file_type)
          else
            # we are now dealing with singleton files or sequence data, so process accordingly (making sure to ignore directories)
            if DirectoryListing::PRIMARY_DATA_TYPES.any? {|ext| file_type.include?(ext)} && !file.name.end_with?('/')
              # process fastq file into appropriate directory listing
              process_directory_listing_file(file, file_type)
            else
              # make sure file is not actually a folder by checking its size
              if file.size > 0
                # create a new entry
                unsynced_file = StudyFile.new(study_id: @study.id, name: file.name, upload_file_name: file.name,
                                              upload_content_type: file.content_type, upload_file_size: file.size,
                                              generation: file.generation, remote_location: file.name)
                @unsynced_files << unsynced_file
              end
            end
          end
        end
      end

      # helper to process a file into a directory listing object
      def process_directory_listing_file(file, file_type)
        directory = DirectoryListing.get_folder_name(file.name)
        all_dirs = @directories + @unsynced_directories
        existing_dir = all_dirs.detect {|d| d.name == directory && d.file_type == file_type}
        found_file = {'name' => file.name, 'size' => file.size, 'generation' => file.generation}
        if existing_dir.nil?
          dir = @study.directory_listings.build(name: directory, file_type: file_type, files: [found_file], sync_status: false)
          @unsynced_directories << dir
        elsif existing_dir.files.detect {|f| f['generation'].to_i == file.generation }.nil?
          existing_dir.files << found_file
          existing_dir.sync_status = false
          if @unsynced_directories.map(&:name).include?(existing_dir.name)
            @unsynced_directories.delete(existing_dir)
          end
          @unsynced_directories << existing_dir
        end
      end
    end
  end
end
