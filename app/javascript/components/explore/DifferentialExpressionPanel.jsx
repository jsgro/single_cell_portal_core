
import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faTimes, faDownload, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'

import { closeModal } from '~/components/search/controls/SearchPanel'
import DifferentialExpressionGroupPicker from '~/components/visualization/controls/DifferentialExpressionGroupPicker'

const helpModalContent = (<div>
  <h4 className="text-center">Differential expression</h4><br/>
  This is an experimental differential expression (DE) feature.  The DE data{' '}
  shown in the table has been computed by Single Cell Portal pipelines, using{' '}
  the Scanpy package.  It shows metrics that use the Wilcoxon rank-sum test{' '}
  of expression for each gene in the group you selected, compared to that in{' '}
  all other groups in this annotation.
  {/* TODO (SCP-4352): Add another link to DE survey */}
  {/* TODO (SCP-4354): Update this reviewed wording, and any fuller docs e.g. on Zendesk */}
</div>)

/** Differential expression panel shown at right in Explore tab */
export default function DifferentialExpressionPanel({
  deGroup, deGenes, deFileUrl, searchGenes,
  exploreInfo, setShowDeGroupPicker, setDeGenes, setDeGroup, setDeFileUrl
}) {
  const [showDeHelpModal, setShowDeHelpModal] = useState(false)

  return (
    <>
      <DifferentialExpressionGroupPicker
        exploreInfo={exploreInfo}
        setShowDeGroupPicker={setShowDeGroupPicker}
        deGenes={deGenes}
        setDeGenes={setDeGenes}
        deGroup={deGroup}
        setDeGroup={setDeGroup}
        setDeFileUrl={setDeFileUrl}
      />

      {deGenes &&
      <>
        <table className="table table-terra table-scp-compact" style={{ 'width': '105%', 'maxWidth': 'inherit' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>log<sub>2</sub>(FC)</th>
              <th>Adj. p-value</th>
            </tr>
          </thead>
          <tbody>
            {deGenes.map((deGene, i) => {
              return (
                <tr key={i} style={{ 'fontSize': '13px' }}>
                  <td>
                    <label
                      title="Click to view gene expression.  Arrow down (↓) and up (↑) to quickly scan."
                    ><input
                        type="radio"
                        analytics-name="de-gene-link"
                        style={{ 'marginRight': '10px' }}
                        name="selected-gene-differential-expression"
                        onClick={() => {searchGenes([deGene.name])}}/>
                      {deGene.name}</label></td>
                  <td>{deGene.log2FoldChange}</td>
                  <td>{deGene.pvalAdj}</td>
                </tr>)
            })}
          </tbody>
        </table>
        15 most DE genes
        <a href={deFileUrl} data-analytics-name="differential-expression-download">
          <FontAwesomeIcon className="icon-left" icon={faDownload}/></a><br/><br/>
        <FontAwesomeIcon data-toggle="tooltip" data-data-analytics-name="differential-expression-help"
          className="action log-click help-icon" icon={faInfoCircle}/>
        <Modal
          show={showDeHelpModal}
          onHide={() => closeModal(setShowDeHelpModal)}
          animation={false}
          bsSize='large'>
          <Modal.Body className="">
            { helpModalContent }
          </Modal.Body>
        </Modal>
      </>
      }
    </>
  )
}

/** Top matter for differential expression panel shown at right in Explore tab */
export function DifferentialExpressionPanelHeader({
  toggleViewOptions, setDeGenes, setDeGroup, setShowDifferentialExpressionPanel
}) {
  return (
    <>
      <button className="action fa-lg"
        onClick={() => {
          setDeGenes(null)
          setDeGroup(null)
          setShowDifferentialExpressionPanel(false)
        }}
        title="Exit differential expression panel"
        data-analytics-name="differential-expression-panel-exit"
        style={{ 'float': 'left', 'marginLeft': '-10px' }}>
        <FontAwesomeIcon icon={faArrowLeft}/>
      </button>
      <span style={{ 'marginLeft': '5px' }}>Differentially expressed genes</span>
      <button className="action"
        onClick={toggleViewOptions}
        title="Hide options"
        data-analytics-name="view-options-hide"
        style={{ 'float': 'right', 'position': 'relative', 'left': '5px' }}>
        <FontAwesomeIcon className="fa-lg" icon={faTimes}/>
      </button>
    </>
  )
}
