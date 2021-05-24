import React, { useEffect, useState } from 'react'
import { useTable } from 'react-table'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'
import _cloneDeep from 'lodash/cloneDeep'

import DownloadUrlModal from './DownloadUrlModal'
import { fetchDownloadInfo } from 'lib/scp-api'
import camelcaseKeys from 'camelcase-keys'

/**
  * @fileoverview a modal that, given a list of study accessions, allows a user to select/deselect
  * studies and file types for download.  This queries the bulk_download/summary API method
  * to retrieve the list of study details and available files
  */

const NEW_ROW_STATE = {all: true, matrix: true, metadata: true, cluster: true}

export default function DownloadSelectionModal({studyAccessions, show, setShow}) {
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
    NEXT
  </button>
  let downloadCountText = `${prettyBytes} selected`
  if (fileCount === 0) {
    downloadButton = <button className="btn btn-primary" disabled="disabled">
      No files selected
    </button>
    downloadCountText = ''
  }

  return <Modal
    id='bulk-download-modal'
    className="full-height-modal"
    show={show}
    onHide={() => setShow(false)}
    animation={false}
    bsSize='large'>
    <Modal.Body>
      <div className="download-modal">
        <DownloadStepsHeader isFirstStep={true}/>
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
      { downloadCountText } &nbsp;
      <button className="btn action" onClick={() => setShow(false)} data-analytics-name="download-modal-cancel">
        CANCEL
      </button>
      { downloadButton }
    </Modal.Footer>
    { showUrlModal && <DownloadUrlModal
      show={showUrlModal}
      closeParent={() => setShow(false)}
      setShow={setShowUrlModal}
      fileIds={selectedFileIds}/> }
  </Modal>
}


function DownloadSelectionTable({downloadInfo, setDownloadInfo, selectedBoxes, setSelectedBoxes}) {
  function updateSelection(value, isAllStudies, column, index) {
    const updatedSelection = _cloneDeep(selectedBoxes)
    let colsToUpdate = [column]
    if (column === 'all') {
      colsToUpdate = COLUMN_ORDER_WITH_ALL
    }
    if (isAllStudies) {
      colsToUpdate.forEach(colType => updatedSelection.all[colType] = value)
      updatedSelection.studies.forEach(studySelection => {
        colsToUpdate.forEach(colType => studySelection[colType] = value)
      })
    } else {
      colsToUpdate.forEach(colType => updatedSelection.studies[index][colType] = value)
    }
    // update the study select-all checkboxes given their selection
    updatedSelection.studies.forEach(studySelection => {
      const rowValues = COLUMN_ORDER.map(colType => studySelection[colType])
      studySelection.all = rowValues.every(val => !!val)
    })
    // update the top row select-all checkboxes given their selection
    COLUMN_ORDER_WITH_ALL.forEach(colType => {
      const columnValues = updatedSelection.studies.map(studySelection => studySelection[colType])
      updatedSelection.all[colType] = columnValues.every(val => !!val)
    })
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

export function DownloadStepsHeader(isFirstStep) {
  return <div>
    <div className="download-steps-header row">
      <div className="col-md-4">
        <h3 className={isFirstStep ? '' : 'greyed'}>
          <span className="badge">1</span>
          &nbsp; Select the files
        </h3>
      </div>
      <div className="col-md-4">
        <h3 className={!isFirstStep ? '' : 'greyed'}>
          <span className="badge">2</span>
          &nbsp; Get terminal link
        </h3>
      </div>
    </div>
    <div className="greyed">
      Files are downloaded via the command line. Once you confirm your files selection, you will get a link
      to use on your terminal.
    </div>
  </div>
}

const COLUMN_ORDER = ['matrix', 'metadata', 'cluster']
const COLUMN_ORDER_WITH_ALL = ['all', ...COLUMN_ORDER]
const COLUMNS = {
  matrix: {
    title: 'Matrix',
    types: ['Expression Matrix', 'MM Coordinate Matrix', '10X Genes File', '10X Barcodes File'],
    info: 'Expression matrix files, including processed or raw counts files'
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


