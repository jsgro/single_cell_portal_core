class RemoveUploadWizardFeatureFlag < Mongoid::Migration
    def self.up
      FeatureFlag.retire_feature_flag('react_upload_wizard')
    end
  
    def self.down
      FeatureFlag.create!(name: 'react_upload_wizard',
                          default_value: false,
                          description: 'show the react upload wizard component')
    end
  end
  