FactoryBot.define do
  # gets a study object, defaulting to the first user found.  Auto-appends a unique number to the name, and a note
  # in the description of the study, to aid in test DB uniqueness and cleanup efforts
  factory :study do
    transient do
      auto_suffixes { true }
      # If specified, the created study will be added to the passed-in array after creation
      # this enables easy managing of a central list of studies to be cleaned up by a test suite
      test_array { nil }
    end
    public { true }
    data_dir { '/tmp' }
    user { User.first }
    after(:create) do |study, evaluator|
      if evaluator.auto_suffixes
        study.name << " #{SecureRandom.hex(8)} [FactoryBot]"
        calling_test =  caller.find { |s| /_test.rb/ =~ s }
        description_suffix = " Test study created by FactoryBot at #{Time.current}. #{calling_test}"
        if study.description.nil?
          study.description = ""
        end
        study.description << description_suffix
        study.save
      end
      if evaluator.test_array
        evaluator.test_array.push(study)
      end
    end
    # create a study but mark as detached, so a Terra workspace is not created
    factory :detached_study do
      detached { true }
    end
  end
end
