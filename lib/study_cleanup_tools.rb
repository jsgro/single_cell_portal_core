# study_cleanup_tools.rb
#
# module for ensuring that each test build starts with clean schemas and Terra billing projects
# methods are safeguarded so that they cannot be run on deployed instances
# methods can be run against a local instance by passing allow_dev_env: true (but not recommended)

module StudyCleanupTools

  # disallow running an cleanup commands on deployed production & staging hosts
  DISALLOWED_HOSTS = /singlecell(-staging)?\.broadinstitute/

  # disallow running deletes against any of these projects
  DISALLOWED_BILLING_PROJECTS = %w(single-cell-portal single-cell-portal-staging)

  # delete all studies and remove associated Terra workspaces & Google buckets
  # can only be invoked in the test or pentest environment
  #
  # * *params*
  #   - +allow_dev_env+: (Boolean) => allow execution of this method in development environment (default: false)
  #
  # * *raises*
  #   - (ArgumentError) => if command cannot be run for failing a security check (hostname, project, environment, etc)
  #
  # * *returns*
  #   - (TrueClass) => true if method was performed, otherwise ArgumentError is thrown
  def self.destroy_all_studies_and_workspaces(allow_dev_env: false)
    if validate_environment!(allow_dev_env) && validate_hostname! && validate_continuous_integration!
      Study.all.each do |study|
        # do not mass delete studies in protected projects
        study.destroy_and_remove_workspace if permit_billing_project?(study.firecloud_project)
      end
      true
    end
  end

  # delete all Terra workspaces in a project that do not have a study associated with them in the given env/schema
  # will ignore any workspaces created by different service accounts/users
  # by default will only run against test/pentest environment during continuous integration build
  #
  # * *params*
  #   - +project_name+: (String) => Name of Terra billing project (defaults to FireCloudClient::PORTAL_NAMESPACE )
  #   - +allow_dev_env+: (Boolean) => allow execution of this method in development environment (default: false)
  #
  # * *raises*
  #   - (ArgumentError) => if command cannot be run for failing a security check (hostname, project, environment, etc)
  #
  # * *returns*
  #   - (TrueClass) => true if method was performed, otherwise ArgumentError is thrown
  def self.delete_all_orphaned_workspaces(project_name = FireCloudClient::PORTAL_NAMESPACE, allow_dev_env: false)
    if validate_hostname! && validate_environment!(allow_dev_env) && validate_billing_project!(project_name) && validate_continuous_integration!
      workspaces = ApplicationController.firecloud_client.workspaces(project_name)
      workspaces.each do |workspace|
        ws_attr = workspace.dig('workspace')
        ws_name = ws_attr['name']
        ws_project = ws_attr['namespace']
        ws_owner = ws_attr['createdBy']
        existing_study = Study.find_by(firecloud_project: ws_project, firecloud_workspace: ws_name)
        if existing_study.present?
          puts "skipping #{ws_project}/#{ws_name} as it belongs to #{existing_study.accession}"
          next
        else
          begin
            if is_workspace_owner?(workspace)
              print "deleting #{ws_attr['name']}... "
              ApplicationController.firecloud_client.delete_workspace(ws_project, ws_name)
              puts "#{ws_attr['name']} successfully deleted"
            else
              puts "skipping #{ws_project}/#{ws_name} because it was created by #{ws_owner}"
            end
          rescue => e
            puts "Unable to delete #{ws_project}/#{ws_name} due to: #{e.class.name} - #{e.message}"
          end
        end
      end
      true
    end
  end

  ##
  # security safeguards to prevent accidental deletes of production/staging workspaces and studies
  ##

  # ensure commands cannot be run on deployed hosts
  #
  # * *raises*
  #   - (ArgumentError) => if hostname matches DISALLOWED_HOSTS
  #
  # * *returns*
  #   - (TrueClass) => true if hostname passes validation
  def self.validate_hostname!
    current_host = Socket.gethostname
    if current_host =~ DISALLOWED_HOSTS
      raise ArgumentError.new("#{current_host} is not a permitted host for running StudyCleanupTools methods")
    else
      true
    end
  end

  # ensure commands cannot be run against protected billing projects for production/staging
  #
  # * *raises*
  #   - (ArgumentError) => if billing project matches DISALLOWED_BILLING_PROJECTS, or is not the configured project for this instance
  #
  # * *returns*
  #   - (TrueClass) => true if billing project passes validation
  def self.validate_billing_project!(project_name)
    if !permit_billing_project?(project_name)
      raise ArgumentError.new("#{project_name} is not a permitted billing project for running StudyCleanupTools methods")
    else
      true
    end
  end

  # ensure commands cannot be run in production/staging environments
  # can be run manually in development if allow_dev_env is set to true
  #
  # * *raises*
  #   - (ArgumentError) => if environment is not test/pentest, or is development and allow_dev_env = false
  #
  # * *returns*
  #   - (TrueClass) => true if environment passes validation
  def self.validate_environment!(allow_dev_env = false)
    environments = %w(test pentest)
    allow_dev_env ? environments << 'development' : nil
    if !environments.include?(Rails.env)
      raise ArgumentError.new("#{Rails.env} is not a permitted environment for running StudyCleanupTools methods")
    else
      true
    end
  end

  # ensure commands cannot be run in production/staging environments
  # can be run manually in development if allow_dev_env is set to true
  #
  # * *raises*
  #   - (ArgumentError) => if this is not a continuous integration run (governed by ENV['CI'] == true)
  #
  # * *returns*
  #   - (TrueClass) => true if environment passes validation
  def self.validate_continuous_integration!
    if !ENV['CI'] || ENV['CI'].blank?
      raise ArgumentError.new("This is not a continuous integration test run, ENV['CI'] is not true")
    else
      true
    end
  end

  private

  # is requested project permitted to run a command
  def self.permit_billing_project?(project_name)
    !DISALLOWED_BILLING_PROJECTS.include?(project_name) && project_name == FireCloudClient::PORTAL_NAMESPACE ? true : false
  end

  # is requested workspace created by this service account
  def self.is_workspace_owner?(workspace_attributes)
    ApplicationController.firecloud_client.issuer == workspace_attributes.dig('workspace', 'createdBy')
  end
end
