# factory for study_file test objects.
FactoryBot.define do
  factory :study_file do
    upload_file_name { name }
    factory :metadata_file do
      file_type { 'Metadata' }
      transient do
        # cell_input is an array of all cell names
        # e.g.  ['cellA', 'cellB', 'cellC']
        cell_input { [] }
        # annotation_input is an array of objects specifying name, type, and values for annotations
        # values should be an array in the same length and order as the 'cells' array above
        # e.g. [{ name: 'category', type: 'group', values: ['foo', 'foo', 'bar'] }]
        annotation_input { [] }
      end
      after(:create) do |file, evaluator|
        evaluator.annotation_input.each do |annotation|
          FactoryBot.create(:cell_metadatum,
                            annotation_input: annotation,
                            study_file: file)

        end
        FactoryBot.create(:data_array,
                          array_type: 'cells',
                          name: 'All Cells',
                          array_index: 0,
                          values: evaluator.cell_input,
                          study_file: file)
      end
    end
    factory :cluster_file do
      file_type { 'Cluster' }
      transient do
        # cell_input is a hash of three (or 4) arrays: cells, x and y and z
        # {
        #   x: [1, 2, 3],
        #   y: [1, 2, 3],
        #   cells: ['cellA', 'cellB', 'cellC']
        # }
        cell_input {
          {}
        }
        # annotation_input is an array of objects specifying name, type, and values for annotations
        # values should be an array in the same length and order as the 'cells' array above
        # e.g. [{ name: 'category', type: 'group', values: ['foo', 'foo', 'bar'] }]
        annotation_input { [] }
      end
      after(:create) do |file, evaluator|
        FactoryBot.create(:cluster_group_with_cells,
                          annotation_input: evaluator.annotation_input,
                          cell_input: evaluator.cell_input,
                          study_file: file)
      end
    end
    factory :expression_file do
      file_type { 'Expression Matrix' }
      transient do
        # expression_input is a hash of gene names to expression values
        # expression values should be an array of arrays, where each sub array is a cellName->value pair
        # e.g.
        # {
        #   farsa: [['cellA', 0.0],['cellB', 1.1], ['cellC', 0.5]],
        #   phex: [['cellA', 0.6],['cellB', 6.1], ['cellC', 4.5]]
        # }
        expression_input { {} }
      end
      after(:create) do |file, evaluator|
        evaluator.expression_input.each do |gene, expression|
          FactoryBot.create(:gene_with_expression,
                            expression_input: expression,
                            study_file: file)
        end
      end
    end
  end
end
