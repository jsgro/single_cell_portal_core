json.set! :accession, study.accession
json.set! :name, study.name
json.set! :description, strip_tags(study.description)
json.set! :public, study.public
json.set! :detached, study.detached
json.set! :cell_count, study.cell_count
json.set! :gene_count, study.gene_count
