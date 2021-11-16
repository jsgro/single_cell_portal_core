import React, { useEffect, useState } from 'react'
import Modal from 'react-bootstrap/lib/Modal'
import _cloneDeep from 'lodash/cloneDeep'

import DownloadCommand from './DownloadCommand'
import DownloadSelectionTable, {
  newSelectedBoxesState, getSelectedFileHandles, getSelectedFileStats
} from './DownloadSelectionTable'
import { bytesToSize } from 'lib/stats'

import { fetchDownloadInfo, fetchDrsInfo } from 'lib/scp-api'

const AZUL_COLUMNS = ['project_manifest', 'analysis', 'sequence']
const SCP_COLUMNS = ['matrix', 'metadata', 'cluster']

/**
  * a modal that, given a list of study accessions, allows a user to select/deselect
  * studies and file types for download.  This queries the bulk_download/summary API method
  * to retrieve the list of study details and available files
  */
export default function DownloadSelectionModal({ studyAccessions, azulFileInfo, show, setShow }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAzul, setIsLoadingAzul] = useState(true)
  const [downloadInfo, setDownloadInfo] = useState([])
  const [selectedBoxes, setSelectedBoxes] = useState()
  const [downloadInfoAzul, setDownloadInfoAzul] = useState([])
  const [selectedBoxesAzul, setSelectedBoxesAzul] = useState()
  const [stepNum, setStepNum] = useState(1)

  const scpAccessions = studyAccessions.filter(accession => accession.startsWith('SCP'))
  const azulAccessions = studyAccessions.filter(accession => !accession.startsWith('SCP'))
  const showAzulSelectionPane = azulAccessions.length > 0
  const { fileCount, fileSize } = getSelectedFileStats(downloadInfo, selectedBoxes, isLoading)
  const { fileCount: fileCountTDR, fileSize: fileSizeTDR } =
    getSelectedFileStats(downloadInfoAzul, selectedBoxesAzul, isLoadingAzul)
  const prettyBytes = bytesToSize(fileSize + fileSizeTDR)
  const selectedFileIds = getSelectedFileHandles(downloadInfo, selectedBoxes)
  const selectedTdrFiles = getSelectedFileHandles(downloadInfoAzul, selectedBoxesAzul, true)

  /**
    render bulk download table for SCP & TDR/HCA studies
   */
  function renderFileTables(result=[]) {
    setSelectedBoxes(newSelectedBoxesState(result, SCP_COLUMNS))
    setDownloadInfo(result)
    setIsLoading(false)
    if (showAzulSelectionPane) {
      setSelectedBoxesAzul(newSelectedBoxesState(azulFileInfo, AZUL_COLUMNS))
      setDownloadInfoAzul(azulFileInfo)
      setIsLoadingAzul(false)
    }
  }

  useEffect(() => {
    if (show) {
      setIsLoading(true)
      setIsLoadingAzul(true)
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
            { showAzulSelectionPane &&
              <div>
                <h4>Human Cell Atlas studies</h4>
                <DownloadSelectionTable
                  isLoading={isLoadingAzul}
                  downloadInfo={downloadInfoAzul}
                  selectedBoxes={selectedBoxesAzul}
                  setSelectedBoxes={setSelectedBoxesAzul}
                  columnTypes={AZUL_COLUMNS}/>
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
