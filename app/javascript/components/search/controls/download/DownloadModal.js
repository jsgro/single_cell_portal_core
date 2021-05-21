import React, { useEffect, useState } from 'react'
import { useTable } from 'react-table'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'
import _cloneDeep from 'lodash/cloneDeep'

import { fetchDownloadInfo } from 'lib/scp-api'
import camelcaseKeys from 'camelcase-keys'

const exStudies = [{"name":"Mouse stomach cells and GERD","accession":"SCP10","description":"Investigating mouse stomach tissue in mice with GERD. Jean Chang, Eric Weitz, Jon Bistline, Eno-Abasi Augustine-Akpan, Devon Bush, Vicky Horst.  Journal of SCP Synthetic Studies.  Volume 1, p1, February 2020.  Adding synthetic study data to development and staging environments has been shown to improve testability of new code.  We extend those findings to the Single Cell Portal by adding this synthetic data.","studyFiles":[{"name":"metadata.tsv","file_type":"Metadata","uploadFileSize":22843},{"name":"expression_matrix.tsv","file_type":"Expression Matrix","uploadFileSize":2669},{"name":"cluster.tsv","file_type":"Cluster","uploadFileSize":4473}]},{"name":"Male Mouse brain","accession":"SCP32","description":"Investigating male mouse brain from healthy specimens. Jean Chang, Eric Weitz, Jon Bistline, Eno-Abasi Augustine-Akpan, Devon Bush, Vicky Horst. Journal of SCP Synthetic Studies. Volume 1, p1, February 2020. Adding synthetic study data to development and staging environments has been shown to improve testability of new code. We extend those findings to the Single Cell Portal by adding this synthetic data.","studyFiles":[{"name":"metadata.tsv","file_type":"Metadata","uploadFileSize":31737},{"name":"expression_matrix.tsv","file_type":"Expression Matrix","uploadFileSize":3208},{"name":"raw_counts.tsv","file_type":"Expression Matrix","uploadFileSize":3483},{"name":"cluster.tsv","file_type":"Cluster","uploadFileSize":4603,"bundled_files":[{"name":"coordinate_labels.tsv","file_type":"Coordinate Labels","uploadFileSize":85}]},{"name":"coordinate_labels.tsv","file_type":"Coordinate Labels","uploadFileSize":85},{"name":"DELETE-6e5e0358-ded7-4038-a483-5252deb97640","file_type":"DELETE","uploadFileSize":5586},{"name":"DELETE-d4d4c011-ef01-492d-a986-eef9e56eabe2","file_type":"DELETE","uploadFileSize":470249},{"name":"sample2.bam","file_type":"BAM","uploadFileSize":5586,"bundled_files":[{"name":"sample2.bam.bai","file_type":"BAM Index","uploadFileSize":470249}]},{"name":"sample2.bam.bai","file_type":"BAM Index","uploadFileSize":470249},{"name":"studies_data_(17).tsv","file_type":"Documentation","uploadFileSize":132228},{"name":"studies_data_(18).tsv","file_type":"Documentation","uploadFileSize":132482},{"name":"DELETE-df137cd6-6953-4971-aeae-85f6453ddd94","file_type":"DELETE","uploadFileSize":85}]},{"name":"Mouse brain clone","accession":"SCP33","description":"Clone for testing Rails 6","studyFiles":[{"name":"expression_matrix.tsv","file_type":"Expression Matrix","uploadFileSize":3208}]},{"name":"Single nucleus RNA-seq of cell diversity in the adult mouse hippocampus (sNuc-Seq)","accession":"SCP41","description":"Single cell RNA-Seq provides rich information about cell types and states. However, it is difficult to capture rare dynamic processes, such as adult neurogenesis, because isolation of rare neurons from adult tissue is challenging and markers for each phase are limited. Here, we develop Div-Seq, which combines scalable single-nucleus RNA-Seq (sNuc-Seq) with pulse labeling of proliferating cells by EdU to profile individual dividing cells. sNuc-Seq and Div-Seq can sensitively identify closely related hippocampal cell types and track transcriptional dynamics of newborn neurons within the adult hippocampal neurogenic niche, respectively. This study contains the sNuc-Seq analysis performed as a part of the Div-Seq method development.","studyFiles":[{"name":"reformatted_cell_metadata.txt","file_type":"Metadata","uploadFileSize":52947},{"name":"Coordinates_CA1.txt","file_type":"Cluster","uploadFileSize":6473},{"name":"Coordinates_CA3.txt","file_type":"Cluster","uploadFileSize":3016},{"name":"Coordinates_Glia.txt","file_type":"Cluster","uploadFileSize":4548},{"name":"Coordinates_GABAergic.txt","file_type":"Cluster","uploadFileSize":5684},{"name":"Coordinates_DG.txt","file_type":"Cluster","uploadFileSize":32284}]},{"name":"Mouse colon cells with Salmonella","accession":"SCP9","description":"Investigating mouse colon tissue in mice exposed to salmonella infeection. Jean Chang, Eric Weitz, Jon Bistline, Eno-Abasi Augustine-Akpan, Devon Bush, Vicky Horst.  Journal of SCP Synthetic Studies.  Volume 1, p1, February 2020.  Adding synthetic study data to development and staging environments has been shown to improve testability of new code.  We extend those findings to the Single Cell Portal by adding this synthetic data.","studyFiles":[{"name":"metadata.tsv","file_type":"Metadata","uploadFileSize":24570},{"name":"expression_matrix.tsv","file_type":"Expression Matrix","uploadFileSize":2677},{"name":"cluster.tsv","file_type":"Cluster","uploadFileSize":4604}]}]
const NEW_ROW_STATE = {all: true, matrix: true, metadata: true, cluster: true}

export default function DownloadModal({studyAccessions, show, setShow}) {
  const [isLoading, setIsLoading] = useState(true)
  const [downloadInfo, setDownloadInfo] = useState([])
  const [selectedBoxes, setSelectedBoxes] = useState({all: {...NEW_ROW_STATE}, studies: []})

  let totalFileCount = 0
  let totalFileSize = 0
  if (!isLoading) {
    downloadInfo.forEach((study, index) => {
      const {fileCount, fileSize} = getSelectedFileStats(study, index, selectedBoxes)
      totalFileSize += fileSize
      totalFileCount += fileCount
    })
  }
  const prettyBytes = bytesToSize(totalFileSize)

  useEffect(() => {
    if (show) {
      setIsLoading(true)
      fetchDownloadInfo(studyAccessions).then(result => {
        const newSelectedBoxes = {
          all: {...NEW_ROW_STATE},
          studies: result.map(study => ({...NEW_ROW_STATE}))
        }
        setSelectedBoxes(newSelectedBoxes)
        setDownloadInfo(result)
        setIsLoading(false)
      })
    }
  }, [show, studyAccessions.join(',')])

  let downloadButton = <button className="btn btn-primary" data-analytics-name="download-modal-download">
    DOWNLOAD { totalFileCount } files / { prettyBytes }
  </button>
  let downloadCountText = `${downloadInfo.length} studies / ${totalFileCount} files`
  if (totalFileCount === 0 || isLoading) {
    downloadButton = <button className="btn btn-primary" disabled="disabled">
      No files selected
    </button>
    downloadCountText = ''
  }

  return <Modal
    id='bulk-download-modal'
    show={show}
    onHide={() => setShow(false)}
    animation={false}
    bsSize='large'>
    <Modal.Body>
      <div className="download-modal">
        <h3>Download {downloadCountText}</h3>
        <div className="download-table-container">
          {
            isLoading &&
            <div className="text-center">
              Loading file information<br/>
              <FontAwesomeIcon
                icon={faDna}
                data-testid="bulk-download-loading-icon"
                className="gene-load-spinner"
              />
            </div>
          }
          {
            !isLoading &&
            <DownloadSelectionTable
              downloadInfo={downloadInfo}
              setDownloadInfo={setDownloadInfo}
              selectedBoxes={selectedBoxes}
              setSelectedBoxes={setSelectedBoxes}>
            </DownloadSelectionTable>
          }
        </div>
      </div>
    </Modal.Body>
    <Modal.Footer>
      <button className="btn action" onClick={() => setShow(false)} data-analytics-name="download-modal-cancel">
        CANCEL
      </button>
      { downloadButton }
    </Modal.Footer>
  </Modal>
}


function DownloadSelectionTable({downloadInfo, setDownloadInfo, selectedBoxes, setSelectedBoxes}) {
  function updateSelection(value, isAllStudies, column, index) {
    const updatedSelection = _cloneDeep(selectedBoxes)
    let colsToUpdate = [column]
    if (column === 'all') {
      colsToUpdate = ['all', ...COLUMN_ORDER]
    }
    if (isAllStudies) {
      colsToUpdate.forEach(colType => updatedSelection.all[colType] = value)
      updatedSelection.studies.forEach(studySelection => {
        colsToUpdate.forEach(colType => studySelection[colType] = value)
      })
    } else {
      colsToUpdate.forEach(colType => updatedSelection.studies[index][colType] = value)
      // if they make any study-specific changes, uncheck the related top row boxes
      colsToUpdate.forEach(colType => updatedSelection.all[colType] = false)
      updatedSelection.all.all = false
    }
    setSelectedBoxes(updatedSelection)
  }

  return (
    <table className="table table-terra">
      <thead>
        <tr>
          <td>
            <label>
              <input type="checkbox"
                     data-analytics-name="download-modal-study-checkbox"
                     onChange={e => updateSelection(e.target.checked, true, 'all')}
                     checked={selectedBoxes.all['all']}>
              </input>
            </label>
          </td>
          <td width="40%">
            Study name
          </td>
          { COLUMN_ORDER.map(colType => {
            return <td key={colType}>
              <label>
                <input type="checkbox"
                       data-analytics-name="download-modal-study-checkbox"
                       onChange={e => updateSelection(e.target.checked, true, colType)}
                       checked={selectedBoxes.all[colType]}>
                </input>
                &nbsp;
                { COLUMNS[colType].title }
              </label>
            </td>
          })}
        </tr>
      </thead>
      <tbody>
        { downloadInfo.map((study, index) => {
          return <tr key={study.accession}>
            <td>
              <label>
                <input type="checkbox"
                       data-analytics-name="download-modal-study-checkbox"
                       onChange={e => updateSelection(e.target.checked, false, 'all', index)}
                       checked={selectedBoxes.studies[index].all}>
                </input>
              </label>
            </td>
            <td width="40%">
              { study.name }
            </td>
            { COLUMN_ORDER.map(colType => {
              return <td key={colType}>
                <StudyFileCheckbox
                  study={study}
                  studyIndex={index}
                  colType={colType}
                  selectedBoxes={selectedBoxes}
                  updateSelection={updateSelection}/>
              </td>
            })}
          </tr>
        })}
      </tbody>
    </table>
  )
}

const COLUMN_ORDER = ['matrix', 'cluster', 'metadata']
const COLUMNS = {
  matrix: {
    title: 'Matrix',
    types: ['Expression Matrix', 'MM Coordinate Matrix', '10X Genes File', '10X Barcodes File'],
    info: 'Expression matrix files, including both dense and sparse, and processed or raw counts files'
  },
  cluster: {
    title: 'Clustering',
    types: ['Cluster'],
    info: 'Clustering coordinate files, including 2D and 3D clustering, as well as spatial'
  },
  metadata: {
    title: 'Metadata',
    types: ['Metadata'],
    info: 'The listing of all cells in the study, along with associated metadata such as species, cell type, etc...'
  }
}


function StudyFileCheckbox({study, studyIndex, selectedBoxes, colType, updateSelection}) {
  const {fileCount, fileSize} = getFileStats(study, COLUMNS[colType].types)
  if (fileCount === 0) {
    return <span className="detail">none</span>
  }
  return <label>
    <input type="checkbox"
           data-analytics-name="download-modal-study-checkbox"
           onChange={e => updateSelection(e.target.checked, false, colType, studyIndex)}
           checked={selectedBoxes.studies[studyIndex][colType]}>
    </input>
    &nbsp;
    {fileCount} files {bytesToSize(fileSize)}
  </label>
}

function getFileStats(study, fileTypes) {
  const files = study.studyFiles.filter(file => fileTypes.includes(file.file_type))
  const fileCount = files.length
  const fileSize = files.reduce((sum, studyFile) => sum + studyFile.upload_file_size, 0)
  return {fileCount, fileSize}
}

function getSelectedFileStats(study, studyIndex, selectedBoxes) {
  let totalFileCount = 0
  let totalFileSize = 0
  COLUMN_ORDER.forEach(colType => {
    if (selectedBoxes.studies[studyIndex][colType]) {
      const {fileCount, fileSize} = getFileStats(study, COLUMNS[colType].types)
      totalFileCount += fileCount
      totalFileSize += fileSize
    }
  })
  return { fileCount: totalFileCount, fileSize: totalFileSize }
}

function getClusterFiles(study) {
  const CLUSTER_TYPES = ['Cluster']
  return study.studyFiles.filter(file => CLUSTER_TYPES.includes(file.file_type))
}



/**
 * Format number in bytes, with human-friendly units
 *
 * Derived from https://gist.github.com/lanqy/5193417#gistcomment-2663632
 */
function bytesToSize(bytes) {
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) {return 'n/a'}

  // eweitz: Most implementations use log(1024), but such units are
  // binary and have values like MiB (mebibyte)
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10)

  if (i === 0) {return `${bytes}${sizes[i]}`}
  return `${(bytes / (1000 ** i)).toFixed(1)}${sizes[i]}`
}


