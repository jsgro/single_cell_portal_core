# factory for gene objects, and optional associated expression data
FactoryBot.define do
  factory :gene do
    study { study_file.study }
    searchable_name { name.downcase }
    gene_id { name + '_id' }

    factory :gene_with_expression do
      transient do
        # convenience allowing specification expression data as an array of [cell_name, value] pairs
        expression_input {
          [['cellA', 0.0],['cellB', 1.1], ['cellC', 0.5]]
        }
      end
      after(:create) do |gene, evaluator|

        non_zero_exp_data = evaluator.expression_input.select { |cell_datum| cell_datum[1] > 0 }

        FactoryBot.create(:data_array,
                          gene: gene,
                          array_type: 'cells',
                          name: "#{gene.name} Cells",
                          array_index: 0,
                          values: non_zero_exp_data.map {|cell_datum| cell_datum[0]},
                          study_file: evaluator.study_file)
        FactoryBot.create(:data_array,
                          gene: gene,
                          array_type: 'expression',
                          name: "#{gene.name} Expression",
                          array_index: 0,
                          values: non_zero_exp_data.map {|cell_datum| cell_datum[1]},
                          study_file: evaluator.study_file)

      end
    end
  end
end
