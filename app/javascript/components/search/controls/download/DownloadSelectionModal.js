import React, { useEffect, useState } from 'react'
import Modal from 'react-bootstrap/lib/Modal'
import _cloneDeep from 'lodash/cloneDeep'

import DownloadCommand from './DownloadCommand'
import DownloadSelectionTable, {
  newSelectedBoxesState, getSelectedFileHandles, getSelectedFileStats, bytesToSize
} from './DownloadSelectionTable'

import { fetchDownloadInfo, fetchDrsInfo } from 'lib/scp-api'

const TDR_COLUMNS = ['project_manifest', 'analysis', 'sequence']
const SCP_COLUMNS = ['matrix', 'metadata', 'cluster']

/**
  * a modal that, given a list of study accessions, allows a user to select/deselect
  * studies and file types for download.  This queries the bulk_download/summary API method
  * to retrieve the list of study details and available files
  */
export default function DownloadSelectionModal({ studyAccessions, tdrFileInfo, show, setShow }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTDR, setIsLoadingTDR] = useState(true)
  const [downloadInfo, setDownloadInfo] = useState([])
  const [selectedBoxes, setSelectedBoxes] = useState()
  const [downloadInfoTDR, setDownloadInfoTDR] = useState([])
  const [selectedBoxesTDR, setSelectedBoxesTDR] = useState()
  const [stepNum, setStepNum] = useState(1)

  const scpAccessions = studyAccessions.filter(accession => accession.startsWith('SCP'))
  const tdrAccessions = studyAccessions.filter(accession => !accession.startsWith('SCP'))
  const showTDRSelectionPane = tdrAccessions.length > 0
  const { fileCount, fileSize } = getSelectedFileStats(downloadInfo, selectedBoxes, isLoading)
  const { fileCount: fileCountTDR, fileSize: fileSizeTDR } =
    getSelectedFileStats(downloadInfoTDR, selectedBoxesTDR, isLoadingTDR)
  const prettyBytes = bytesToSize(fileSize + fileSizeTDR)
  const selectedFileIds = getSelectedFileHandles(downloadInfo, selectedBoxes)
  const selectedTdrFiles = getSelectedFileHandles(downloadInfoTDR, selectedBoxesTDR, true)

  /** For TDR studies, we will know from the tdrFileInfo object how many files of each type there are
   * But we need to query the drsInfo so that we can get the file sizes and download urls */
  function initializeTDRTable() {
    setSelectedBoxesTDR(newSelectedBoxesState(tdrFileInfo, TDR_COLUMNS))
    setDownloadInfoTDR(tdrFileInfo)
    setIsLoadingTDR(false)
    // pull the drs ids out of each study and put them in a single array
    // calling filter at end removes metadata file that does not have a DRS id
    const drsIds = tdrFileInfo.map(study => study.studyFiles.map(sfile => sfile.drs_id))
      .reduce((acc, val) => acc.concat(val), []).filter(e => e != null)
    fetchDrsInfo(drsIds).then(result => {
      const fullTdrFileInfo = _cloneDeep(tdrFileInfo)
      // now iterate through the file info and add file sizes, urls, and file names.
      // the names and urls will be used for making the download request later
      fullTdrFileInfo.forEach(study => {
        study.studyFiles.forEach(sfile => {
          if (sfile.drs_id) {
            const fileId = sfile.drs_id.split('/').slice(-1)[0]
            const matchFile = result.find(file => file.id === fileId)
            if (matchFile) {
              sfile.upload_file_size = matchFile.size
              // we add the url and name to each file info so that they can be sent along with the download
              // request, this allows us to avoid having to query the DRS service again
              sfile.url = matchFile.accessMethods.find(method => method.type === 'https').access_url.url
              sfile.name = matchFile.name
            }
          }
        })
      })
      setDownloadInfoTDR(fullTdrFileInfo)
    })
  }

  /**
    render bulk download table for SCP & TDR/HCA studies
   */
  function renderFileTables(result=[]) {
    setSelectedBoxes(newSelectedBoxesState(result, SCP_COLUMNS))
    setDownloadInfo(result)
    setIsLoading(false)
    if (showTDRSelectionPane) {
      initializeTDRTable()
    }
  }

  useEffect(() => {
    if (show) {
      setIsLoading(true)
      setIsLoadingTDR(true)
      fetchDownloadInfo(scpAccessions).then(result => {
        renderFileTables(result)
      })
    }
  }, [show, studyAccessions.join(',')])

  let downloadButton = <button
    className="btn btn-primary"
    onClick={() => setStepNum(2)}
    data-analytics-name="download-modal-next">
    NEXT
  </button>
  if (fileCount + fileCountTDR === 0) {
    downloadButton = <button className="btn btn-primary" disabled="disabled">
      No files selected
    </button>
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
        <div>
          <div className="download-steps-header row">
            <div className="col-md-4">
              <h3 className={stepNum === 1 ? '' : 'greyed'}>
                <span className="badge">1</span>
                &nbsp; Select files
              </h3>
            </div>
            <div className="col-md-6">
              <h3 className={stepNum === 2 ? '' : 'greyed'}>
                <span className="badge">2</span>
                &nbsp; Get terminal command
              </h3>
            </div>
          </div>
          <div className="greyed">
            Files are downloaded via the command line. Once you confirm your files selection, you will get a command
            to use on your terminal.
          </div>
        </div>
        { stepNum === 1 &&
          <div>
            <DownloadSelectionTable
              isLoading={isLoading}
              downloadInfo={downloadInfo}
              selectedBoxes={selectedBoxes}
              setSelectedBoxes={setSelectedBoxes}
              columnTypes={SCP_COLUMNS}/>
            { showTDRSelectionPane &&
              <div>
                <h4>Human Cell Atlas studies</h4>
                <DownloadSelectionTable
                  isLoading={isLoadingTDR}
                  downloadInfo={downloadInfoTDR}
                  selectedBoxes={selectedBoxesTDR}
                  setSelectedBoxes={setSelectedBoxesTDR}
                  columnTypes={TDR_COLUMNS}/>
              </div>
            }
          </div>
        }
        { stepNum === 2 && <DownloadCommand
          closeParent={() => setShow(false)}
          fileIds={selectedFileIds}
          tdrFiles={selectedTdrFiles}/> }
        { !isLoading &&
          <div className="download-size-message">
            <label htmlFor="download-size-amount">Total size</label>
            <span data-testid="download-size-amount" id="download-size-amount">{prettyBytes}</span>
          </div>
        }
      </div>
    </Modal.Body>
    <Modal.Footer>
      { stepNum === 1 &&
        <span>
          <button className="btn action" onClick={() => setShow(false)} data-analytics-name="download-modal-cancel">
            CANCEL
          </button>
          { downloadButton }
        </span>
      }
      { stepNum === 2 &&
        <span>
          <button className="btn action" onClick={() => setStepNum(1)} data-analytics-name="download-modal-back">
            BACK
          </button>
          <button className="btn action"
            onClick={() => setShow(false)}
            data-analytics-name="download-modal-done">
            DONE
          </button>
        </span>
      }
    </Modal.Footer>
  </Modal>
}
