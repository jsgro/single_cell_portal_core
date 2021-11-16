import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import _cloneDeep from 'lodash/cloneDeep'

import { bytesToSize } from 'lib/stats'
import LoadingSpinner from 'lib/LoadingSpinner'


/** component that renders a list of studies so that individual studies/files can be selected
  * @param {Object} downloadInfo study download information as provided by fetchDownloadInfo from scp-api.
  * @param {Boolean} isLoading whether the call to fetchDownloadInfo is still loading
  * @param {Object} selectedBoxes. The current state of the checkboxes for selecting files/studies
  *   see newSelectedBoxesState for an explanation of structure
  * @param {function} setSelectedBoxes function for updating the selectedBoxes state
  * @param {Array - String} columnNames the columns to render in the table, must be in the COLUMNS object in this file
  */
export default function DownloadSelectionTable({
  downloadInfo,
  isLoading,
  selectedBoxes,
  setSelectedBoxes,
  columnTypes
}) {
  const columnTypesWithAll = ['all', ...columnTypes]
  /** update a single checkbox value, and handles updating any connected checkboxes in the table
    * for example, if you update the value of the 'all metadata' checkbox, this checks all the individual
    * study checkboxes.  Likewise, clicking a study checkbox will select/deselect the 'all' checkboxes as appropriate
    * @param {Boolean} value the new checkbox value
    * @param {Boolean} isAllStudies whether the checkbox is the top 'all' row
    * @param {String} column one of 'matrix', 'metadata', 'cluster', 'all'
    * @param {Integer} index the row index of the checkbox (ignored if isAllStudies is true)
    */
  function updateSelection(value, isAllStudies, column, index) {
    const updatedSelection = _cloneDeep(selectedBoxes)
    let colsToUpdate = [column]
    if (column === 'all') {
      colsToUpdate = columnTypesWithAll
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
      const rowValues = columnTypes.map(colType => studySelection[colType])
      studySelection.all = rowValues.every(val => !!val)
    })
    // update the top row select-all checkboxes given their selection
    columnTypesWithAll.forEach(colType => {
      const columnValues = updatedSelection.studies.map(studySelection => studySelection[colType])
      updatedSelection.all[colType] = columnValues.every(val => !!val)
    })
    setSelectedBoxes(updatedSelection)
  }

  return (
    <div className="download-table-container">
      {
        isLoading &&
        <div className="text-center greyed">
          Loading file information<br/>
          <LoadingSpinner data-testid="bulk-download-loading-icon"/>
        </div>
      }
      {
        // only render table if there are results to show
        !isLoading && Object.keys(downloadInfo).length > 0 &&
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
              { columnTypes.map(colType => {
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
                    data-container="terra-table"
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
                { columnTypes.map(colType => {
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
      }
    </div>
  )
}

const COLUMNS = {
  matrix: {
    title: 'Matrix',
    types: ['Expression Matrix', 'MM Coordinate Matrix', '10X Genes File', '10X Barcodes File'],
    info: 'Expression matrix files, including processed or raw count files',
    default: true
  },
  cluster: {
    title: 'Clustering',
    types: ['Cluster'],
    info: 'Clustering coordinate files, including 2D and 3D clustering, as well as spatial',
    default: true
  },
  metadata: {
    title: 'Metadata',
    types: ['Metadata'],
    info: 'The listing of all cells in the study, along with associated metadata such as species, cell type, etc.',
    default: true
  },
  project_manifest: {
    title: 'Project Manifest',
    types: ['Project Manifest'],
    info: 'List of available project files and associated project-level metadata.',
    default: true
  },
  analysis: {
    title: 'Analysis',
    types: ['analysis_file'],
    info: 'Expression matrix files, including processed or raw count files',
    default: true
  },
  sequence: {
    title: 'Sequence',
    types: ['sequence_file'],
    info: 'Sequence files, such as FASTQ, BAM or BAI files',
    default: false
  }
}

/** component for rendering a study file checkbox, along with the size of the files
  * @param {Object} study the study object from the downloadInfo object
  * @param {Integer} studyIndex the index of the study in the selectedBoxes/downloadInfo array
  * @param {String} colType  'matrix', 'metadata', or 'cluster'
  * @param {Function} updateSelection function for updating the checkbox state
  */
function StudyFileCheckbox({ study, studyIndex, selectedBoxes, colType, updateSelection }) {
  const { fileCount, fileSize } = getFileStats(study, COLUMNS[colType].types)
  if (fileCount === 0) {
    return <span className="detail">none</span>
  }
  let sizeIndicator = null
  if (fileSize === undefined || fileSize === 0) {
    // the file sizes are still loading from TDR
    sizeIndicator = <LoadingSpinner data-testid="bulk-download-loading-icon"/>
  } else {
    sizeIndicator = bytesToSize(fileSize)
  }
  return <label>
    <input type="checkbox"
      data-analytics-name="download-modal-checkbox"
      onChange={e => updateSelection(e.target.checked, false, colType, studyIndex)}
      checked={selectedBoxes.studies[studyIndex][colType]}>
    </input>
    &nbsp;
    {fileCount} files {sizeIndicator}
  </label>
}

/** Gets a selectedBoxes state from a downloadInfo object.
  * will contain a 'studies' property with an array with one entry per study
  *
  * { all: {all: true, matrix: true, metadata: true, cluster: true},
  *   studies: [
  *      {all: true, matrix: true, metadata: true, cluster: true}
  *      ...
  *    ]
  *  }
  */
export function newSelectedBoxesState(downloadInfo, colTypes) {
  const newRowState = {}
  colTypes.forEach(colType => newRowState[colType] = COLUMNS[colType].default)
  newRowState.all = Object.values(newRowState).every(val => val)

  return {
    all: { ...newRowState },
    studies: downloadInfo.map(study => ({ ...newRowState }))
  }
}

/** Gets the number of files and bytes for the given downloadInfo, given the selection state
  */
export function getSelectedFileStats(downloadInfo, selectedBoxes, isLoading) {
  let totalFileCount = 0
  let totalFileSize = 0
  if (!isLoading) {
    const fileTypeKeys = Object.keys(selectedBoxes.all).filter(key => key !== 'all')
    downloadInfo.forEach((study, index) => {
      fileTypeKeys.forEach(colType => {
        if (selectedBoxes.studies[index][colType]) {
          const { fileCount, fileSize } = getFileStats(study, COLUMNS[colType].types)
          if (fileCount && fileSize) {
            totalFileCount += fileCount
            totalFileSize += fileSize
          }
        }
      })
    })
  }
  return { fileCount: totalFileCount, fileSize: totalFileSize }
}


/** for a given study and file type, get the number of files and bytes for download
  * @param {Object} study study object from downloadInfo (from scp-api fetchDownloadInfo)
  * @param {Array} fileTypes array of zero or more of 'matrix', 'metadata', 'cluster'
  */
export function getFileStats(study, fileTypes) {
  const files = study.studyFiles.filter(file => fileTypes.includes(file.file_type))
  const fileCount = study.study_source === 'SCP' ? files.length : files.reduce((sum, studyFile) => {
    return sum + studyFile.count
  }, 0)
  const fileSize = files.reduce((sum, studyFile) => {
    return sum + (studyFile.upload_file_size ? studyFile.upload_file_size : 0)
  }, 0)
  return { fileCount, fileSize }
}

/** Gets the file IDs/URLs selected, given downloadInfo and the current selection state
  */
export function getSelectedFileHandles(downloadInfo, selectedBoxes, hashByStudy=false) {
  const fileHandles = hashByStudy ? {} : []
  if (!selectedBoxes) {
    return fileHandles
  }
  const fileTypeKeys = Object.keys(selectedBoxes.all).filter(key => key !== 'all')
  downloadInfo.forEach((study, index) => {
    if (hashByStudy) {
      // initialize empty array for storing file handles by study accession
      fileHandles[study.accession] = []
    }
    fileTypeKeys.forEach(colType => {
      if (selectedBoxes.studies[index][colType]) {
        const filesOfType = study.studyFiles.filter(file => COLUMNS[colType].types.includes(file.file_type))
        {/* eslint-disable-next-line max-len */}
        const selectedHandles = filesOfType.map(file => hashByStudy ? { drs_id: file.drs_id, url: file.url, name: file.name, file_type: file.file_type } : file.id)
        if (hashByStudy) {
          fileHandles[study.accession].push(...selectedHandles)
        } else {
          fileHandles.push(...selectedHandles)
        }
      }
    })
  })
  return fileHandles
}
