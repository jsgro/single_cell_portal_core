FactoryBot.define do
  # gets a ClusterGroup object, defaulting to the first user found.
  factory :cluster_group do
    cluster_type { '2d' }
    cell_annotations { [] }
    name { study_file.name }
    study { study_file.study }

    # create a cluster group with data arrays populated according to a passed-in cell_data object
    factory :cluster_group_with_cells do
      transient do
        # cell_data is a hash of three (or 4) arrays: cells, x and y and z
        # {
        #   x: [1, 2, 3],
        #   y: [1, 2, 3],
        #   cells: ['cellA', 'cellB', 'cellC']
        # }
        cell_data {
          {}
        }
        # annotations is an array of objects specifying name, type, and values for annotations
        # values should be an array in the same length and order as the 'cells' array above
        # e.g. [{ name: 'category', type: 'group', values: ['foo', 'foo', 'bar'] }]
        annotations {
          []
        }
      end
      cell_annotations {
        annotations.map { |a| { name: a[:name], type: a[:type], values: a[:values].uniq } }
      }

      after(:create) do |cluster, evaluator|
        [
          {name: :x, type: 'coordinates'},
          {name: :y, type: 'coordinates'},
          {name: :z, type: 'coordinates'},
          {name: :cells, type: 'cells'}
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
        evaluator.annotations.each do |annotation|
          FactoryBot.create(:data_array,
                            cluster_group: cluster,
                            array_type: 'annotations',
                            name: annotation[:name],
                            array_index: 0,
                            values: annotation[:values],
                            study_file: evaluator.study_file)
        end
      end
    end
  end
end
