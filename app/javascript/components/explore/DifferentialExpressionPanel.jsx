
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faTimes, faDownload, faInfoCircle } from '@fortawesome/free-solid-svg-icons'

import DifferentialExpressionGroupPicker from '~/components/visualization/controls/DifferentialExpressionGroupPicker'

/** Differential expression panel shown at right in Explore tab */
export default function DifferentialExpressionPanel({
  deGroup, deGenes, deFileUrl, searchGenes,
  exploreInfo, setShowDeGroupPicker, setDeGenes, setDeGroup, setDeFileUrl
}) {
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
        15 most DE genes
        <span style={{ 'float': 'right' }}>
          <a href={deFileUrl}
            target="_blank"
            data-analytics-name="differential-expression-download"
            data-toggle="tooltip"
            data-original-title="Download all DE genes data for this group"
          >
            <FontAwesomeIcon icon={faDownload}/></a>
          <a href="TODO"
            target="_blank"
            data-analytics-name="differential-expression-docs"
            style={{ 'marginLeft': '10px' }}
            data-toggle="tooltip"
            data-original-title="Learn about SCP DE analysis"
          >
            <FontAwesomeIcon
              className="action help-icon" icon={faInfoCircle}
            />
          </a>
        </span>
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
      </>
      }
    </>
  )
}

/** Top matter for differential expression panel shown at right in Explore tab */
export function DifferentialExpressionPanelHeader({
  setDeGenes, setDeGroup, setShowDifferentialExpressionPanel
}) {
  return (
    <>
      <span>Differentially expressed genes</span>
      <button className="action fa-lg"
        onClick={() => {
          setDeGenes(null)
          setDeGroup(null)
          setShowDifferentialExpressionPanel(false)
        }}
        title="Exit differential expression panel"
        data-analytics-name="differential-expression-panel-exit">
        <FontAwesomeIcon icon={faArrowLeft}/>
      </button>
    </>
  )
}
