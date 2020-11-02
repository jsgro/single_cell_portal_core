FactoryBot.define do
  # gets a study object, defaulting to the first user found.  Auto-appends a unique number to the name, and a note
  # in the description of the study, to aid in test DB uniqueness and cleanup efforts
  factory :cluster_group do
    cluster_type { '2d' }
    cell_annotations { [] }
    name { study_file.name }
    study { study_file.study }
    # create a study but mark as detached, so a Terra workspace is not created
    factory :cluster_group_with_cells do
      transient do
        # cell_data is a hash of three (or 4) arrays: cells, x and y and z
        cell_data {
          {
            x: [1, 2, 3],
            y: [1, 2, 3],
            text: ['cellA', 'cellB', 'cellC']
          }
        }
      end
      after(:create) do |cluster, evaluator|
        [
          {name: :x, type: 'coordinates'},
          {name: :y, type: 'coordinates'},
          {name: :z, type: 'coordinates'},
          {name: :text, type: 'cells'}
        ].each do |input_type|
          if evaluator.cell_data[input_type[:name]]
            FactoryBot.create(:data_array,
                              cluster_group: cluster,
                              array_type: input_type[:type],
                              name: input_type[:name],
                              array_index: 0,
                              values: evaluator.cell_data[input_type[:name]],
                              study_file: evaluator.study_file)

          end
        end
      end
    end
  end
end
