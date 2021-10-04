import React, { useEffect } from 'react'

import ExpressionFileForm from './ExpressionFileForm'
import { findBundleChildren } from './upload-utils'
import { AddFileButton } from './form-components'

const DEFAULT_NEW_RAW_COUNTS_FILE = {
  is_spatial: false,
  expression_file_info: { is_raw_counts: true, biosample_input_type: 'Whole cell', modality: 'Transcriptomic: unbiased' },
  file_type: 'Expression Matrix'
}

export const fileTypes = ['Expression Matrix', 'MM Coordinate Matrix']

export const rawCountsFileFilter = file => fileTypes.includes(file.file_type) && file.expression_file_info?.is_raw_counts

export default {
  title: 'Raw Count Files',
  name: 'rawCounts',
  component: RawCountsUploadForm,
  fileFilter: rawCountsFileFilter
}

/** form for uploading a parent expression file and any children */
function RawCountsUploadForm({
  formState,
  serverState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse
}) {
  const rawParentFiles = formState.files.filter(rawCountsFileFilter)
  const fileMenuOptions = serverState.menu_options

  useEffect(() => {
    if (rawParentFiles.length === 0) {
      addNewFile(DEFAULT_NEW_RAW_COUNTS_FILE)
    }
  }, [rawParentFiles.length])

  return <div>
    <div className="row">
      <div className="col-md-12">
        <h4>Raw Count Expression Files</h4>
      </div>
    </div>
    <div className="row">
      <div className="col-md-12">
        <div className="form-terra">
          <div className="row">
            <div className="col-md-12">
              <p>Raw count data enables data reuse in new analyses. Ideal raw count data is unfiltered, without normalization or other processing performed. Gene expression scores can be uploaded in either of two file types:</p>
            </div>
          </div>
          { expressionFileStructureHelp }
        </div>
      </div>
    </div>
    { rawParentFiles.map(file => {
      const associatedChildren = findBundleChildren(file, formState.files)
      return <ExpressionFileForm
        key={file._id}
        file={file}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        addNewFile={addNewFile}
        handleSaveResponse={handleSaveResponse}
        fileMenuOptions={fileMenuOptions}
        associatedChildren={associatedChildren}
        bucketName={formState.study.bucket_id}/>
    })}
    <AddFileButton addNewFile={addNewFile} newFileTemplate={DEFAULT_NEW_RAW_COUNTS_FILE}/>
  </div>
}

export const expressionFileStructureHelp = <>
  <div className="row">
    <div className="col-sm-6 padded">
      <a href="https://raw.githubusercontent.com/broadinstitute/single_cell_portal/master/demo_data/expression_example.txt" target="_blank" rel="noreferrer noopener">Expression Matrix</a>
      <pre>GENE&#09;CELL_1&#9;CELL_2&#09;CELL_3&#09;...<br/>It2ma&#09;0&#09;0&#09;0&#09;...<br/>Sergef&#09;0&#09;7.092&#09;0&#09;...<br/>Chil5&#09;0&#09;0&#09;0&#09;...<br/>Fgfr3&#09;0&#9;0&#09;0.978&#09;<br/>...</pre>
      An “Expression Matrix” is a dense matrix (.txt, .tsv, or .csv)** that has a header row containing the value “GENE” in the first column, and single cell names in each successive column.
    </div>
    <div className="col-sm-6 padded" >
      <a href="https://github.com/broadinstitute/single_cell_portal_core/blob/master/test/test_data/GRCh38/matrix.mtx" target="_blank" rel="noreferrer noopener">MM Coordinate Matrix file</a>
      <pre>%%MatrixMarket matrix coordinate real general<br/>%<br/>17123 31231 124124<br/>1 1241 1.0<br/>1 1552 2.0<br/>...</pre>
      An “MM Coordinate Matrix” *, as seen in <a href="https://support.10xgenomics.com/single-cell-gene-expression/software/pipelines/latest/output/matrices" target="_blank" rel="noreferrer noopener">10x Genomics</a>
      &nbsp;is a Matrix Market file (.mtx, .mm, or .txt)** that contains a sparse matrix in coordinate form.<br/>
      You'll be prompted for the&nbsp;
      <a href="https://kb.10xgenomics.com/hc/en-us/articles/115000794686-How-is-the-MEX-format-used-for-the-gene-barcode-matrices" target="_blank" rel="noreferrer noopener">genes</a> and&nbsp;
      <a href="https://kb.10xgenomics.com/hc/en-us/articles/115000794686-How-is-the-MEX-format-used-for-the-gene-barcode-matrices" target="_blank" rel="noreferrer noopener">barcodes</a>
      &nbsp;files after selecting this type.
    </div>
  </div>

  <div className="row">
    <div className="col-md-12">
      <a href="https://www.gnu.org/software/gzip/manual/gzip.html" target="_blank" rel="noreferrer noopener">Gzipped</a>
      &nbsp;files of these types (e.g. .txt.gz) are accepted as well
    </div>
  </div>
</>
