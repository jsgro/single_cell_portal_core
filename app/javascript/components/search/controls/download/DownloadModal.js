import React, { useEffect, useState } from 'react'
import { useTable } from 'react-table'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'
import _cloneDeep from 'lodash/cloneDeep'

import DownloadUrlModal from './DownloadUrlModal'
import { fetchDownloadInfo } from 'lib/scp-api'
import camelcaseKeys from 'camelcase-keys'

const exStudies = [{"name":"Mouse stomach cells and GERD","accession":"SCP10","description":"Investigating mouse stomach tissue in mice with GERD. Jean Chang, Eric Weitz, Jon Bistline, Eno-Abasi Augustine-Akpan, Devon Bush, Vicky Horst.  Journal of SCP Synthetic Studies.  Volume 1, p1, February 2020.  Adding synthetic study data to development and staging environments has been shown to improve testability of new code.  We extend those findings to the Single Cell Portal by adding this synthetic data.","studyFiles":[{"name":"metadata.tsv","id":"60403ce3cc7ba03f9447762c","file_type":"Metadata","uploadFileSize":22843},{"name":"expression_matrix.tsv","id":"60403ce4cc7ba03f9447762e","file_type":"Expression Matrix","uploadFileSize":2669},{"name":"cluster.tsv","id":"60403ce4cc7ba03f94477630","file_type":"Cluster","uploadFileSize":4473}]},{"name":"Male Mouse brain","accession":"SCP32","description":"Investigating male mouse brain from healthy specimens. Jean Chang, Eric Weitz, Jon Bistline, Eno-Abasi Augustine-Akpan, Devon Bush, Vicky Horst. Journal of SCP Synthetic Studies. Volume 1, p1, February 2020. Adding synthetic study data to development and staging environments has been shown to improve testability of new code. We extend those findings to the Single Cell Portal by adding this synthetic data.","studyFiles":[{"name":"metadata.tsv","id":"6092ca23cc7ba0401d690079","file_type":"Metadata","uploadFileSize":31737},{"name":"expression_matrix.tsv","id":"6092ca23cc7ba0401d69007b","file_type":"Expression Matrix","uploadFileSize":3208},{"name":"raw_counts.tsv","id":"6092ca24cc7ba0401d69007d","file_type":"Expression Matrix","uploadFileSize":3483},{"name":"cluster.tsv","id":"6092ca24cc7ba0401d690080","file_type":"Cluster","uploadFileSize":4603,"bundled_files":[{"name":"coordinate_labels.tsv","id":"6092ca25cc7ba0401d690082","file_type":"Coordinate Labels","uploadFileSize":85}]},{"name":"coordinate_labels.tsv","id":"6092ca25cc7ba0401d690082","file_type":"Coordinate Labels","uploadFileSize":85},{"name":"DELETE-6e5e0358-ded7-4038-a483-5252deb97640","id":"6092ca26cc7ba0401d690085","file_type":"DELETE","uploadFileSize":5586},{"name":"DELETE-d4d4c011-ef01-492d-a986-eef9e56eabe2","id":"6092ca27cc7ba0401d690087","file_type":"DELETE","uploadFileSize":470249},{"name":"sample2.bam","id":"6092ca29cc7ba0401d69008a","file_type":"BAM","uploadFileSize":5586,"bundled_files":[{"name":"sample2.bam.bai","id":"6092ca2acc7ba0401d69008c","file_type":"BAM Index","uploadFileSize":470249}]},{"name":"sample2.bam.bai","id":"6092ca2acc7ba0401d69008c","file_type":"BAM Index","uploadFileSize":470249},{"name":"studies_data_(17).tsv","id":"60a2b4e3cc7ba07ff563cef5","file_type":"Documentation","uploadFileSize":132228},{"name":"studies_data_(18).tsv","id":"60a2b5bacc7ba07ff563cefa","file_type":"Documentation","uploadFileSize":132482},{"name":"DELETE-df137cd6-6953-4971-aeae-85f6453ddd94","id":"60a2b932cc7ba07ff563cf03","file_type":"DELETE","uploadFileSize":85}]},{"name":"Mouse brain clone","accession":"SCP33","description":"Clone for testing Rails 6","studyFiles":[{"name":"expression_matrix.tsv","id":"60a2b9c1cc7ba07ff563cf0c","file_type":"Expression Matrix","uploadFileSize":3208}]},{"name":"Single nucleus RNA-seq of cell diversity in the adult mouse hippocampus (sNuc-Seq)","accession":"SCP41","description":"Single cell RNA-Seq provides rich information about cell types and states. However, it is difficult to capture rare dynamic processes, such as adult neurogenesis, because isolation of rare neurons from adult tissue is challenging and markers for each phase are limited. Here, we develop Div-Seq, which combines scalable single-nucleus RNA-Seq (sNuc-Seq) with pulse labeling of proliferating cells by EdU to profile individual dividing cells. sNuc-Seq and Div-Seq can sensitively identify closely related hippocampal cell types and track transcriptional dynamics of newborn neurons within the adult hippocampal neurogenic niche, respectively. This study contains the sNuc-Seq analysis performed as a part of the Div-Seq method development.","studyFiles":[{"name":"reformatted_cell_metadata.txt","id":"60a53dc5cc7ba01261288735","file_type":"Metadata","uploadFileSize":52947},{"name":"Coordinates_CA1.txt","id":"60a53dc7cc7ba01261288737","file_type":"Cluster","uploadFileSize":6473},{"name":"Coordinates_CA3.txt","id":"60a53dc7cc7ba01261288739","file_type":"Cluster","uploadFileSize":3016},{"name":"Coordinates_Glia.txt","id":"60a53dc8cc7ba0126128873b","file_type":"Cluster","uploadFileSize":4548},{"name":"Coordinates_GABAergic.txt","id":"60a53dc9cc7ba0126128873d","file_type":"Cluster","uploadFileSize":5684},{"name":"Coordinates_DG.txt","id":"60a53dc9cc7ba0126128873f","file_type":"Cluster","uploadFileSize":32284}]},{"name":"Mouse colon cells with Salmonella","accession":"SCP9","description":"Investigating mouse colon tissue in mice exposed to salmonella infeection. Jean Chang, Eric Weitz, Jon Bistline, Eno-Abasi Augustine-Akpan, Devon Bush, Vicky Horst.  Journal of SCP Synthetic Studies.  Volume 1, p1, February 2020.  Adding synthetic study data to development and staging environments has been shown to improve testability of new code.  We extend those findings to the Single Cell Portal by adding this synthetic data.","studyFiles":[{"name":"metadata.tsv","id":"60403cd1cc7ba03f94477623","file_type":"Metadata","uploadFileSize":24570},{"name":"expression_matrix.tsv","id":"60403cd2cc7ba03f94477625","file_type":"Expression Matrix","uploadFileSize":2677},{"name":"cluster.tsv","id":"60403cd2cc7ba03f94477627","file_type":"Cluster","uploadFileSize":4604}]}]
const NEW_ROW_STATE = {all: true, matrix: true, metadata: true, cluster: true}

export default function DownloadModal({studyAccessions, show, setShow}) {
  const [isLoading, setIsLoading] = useState(true)
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [downloadInfo, setDownloadInfo] = useState([])
  const [selectedBoxes, setSelectedBoxes] = useState({all: {...NEW_ROW_STATE}, studies: []})

  let {fileCount, fileSize} = getSelectedFileStats(downloadInfo, selectedBoxes, isLoading)
  const prettyBytes = bytesToSize(fileSize)
  const selectedFileIds = getSelectedFileIds(downloadInfo, selectedBoxes)

  useEffect(() => {
    if (show) {
      setIsLoading(true)
      fetchDownloadInfo(studyAccessions).then(result => {
      //Promise.resolve(exStudies).then(result => {
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

  function performDownload() {
    setShowUrlModal(true)
  }

  let downloadButton = <button
    className="btn btn-primary"
    onClick={performDownload}
    data-analytics-name="download-modal-download">
    DOWNLOAD { fileCount } files / { prettyBytes }
  </button>
  let downloadCountText = `${downloadInfo.length} studies / ${fileCount} files`
  if (fileCount === 0) {
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
    { showUrlModal && <DownloadUrlModal show={showUrlModal} setShow={setShowUrlModal} fileIds={selectedFileIds}/> }
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
                     data-analytics-name="download-modal-checkbox"
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
                       data-analytics-name="download-modal-checkbox"
                       onChange={e => updateSelection(e.target.checked, true, colType)}
                       checked={selectedBoxes.all[colType]}>
                </input>
                &nbsp;
                { COLUMNS[colType].title }
              </label>
              &nbsp;
              <FontAwesomeIcon data-analytics-name="download-modal-column-info"
                data-toggle="tooltip"
                data-original-title={COLUMNS[colType].info}
                className="action log-click help-icon"
                icon={faInfoCircle} />
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
                       data-analytics-name="download-modal-checkbox"
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
           data-analytics-name="download-modal-checkbox"
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

function getSelectedFileStats(downloadInfo, selectedBoxes, isLoading) {
  let totalFileCount = 0
  let totalFileSize = 0
  if (!isLoading) {
    downloadInfo.forEach((study, index) => {
      COLUMN_ORDER.forEach(colType => {
        if (selectedBoxes.studies[index][colType]) {
          const {fileCount, fileSize} = getFileStats(study, COLUMNS[colType].types)
          totalFileCount += fileCount
          totalFileSize += fileSize
        }
      })
    })
  }
  return { fileCount: totalFileCount, fileSize: totalFileSize }
}

function getSelectedFileIds(downloadInfo, selectedBoxes) {
  const fileIds = []
  downloadInfo.forEach((study, index) => {
    COLUMN_ORDER.forEach(colType => {
      if (selectedBoxes.studies[index][colType]) {
        const filesOfType = study.studyFiles.filter(file => COLUMNS[colType].types.includes(file.file_type))
        fileIds.push(...filesOfType.map(file => file.id))
      }
    })
  })
  return fileIds
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


