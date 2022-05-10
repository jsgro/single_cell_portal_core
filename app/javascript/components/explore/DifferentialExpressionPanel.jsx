
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faTimes, faDownload } from '@fortawesome/free-solid-svg-icons'

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
        <table className="table table-terra table-scp-compact">
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
                <tr key={i} style={{ 'font-size': '13px' }}>
                  <td>
                    <label
                      title="Click to view gene expression.  Arrow down (↓) and up (↑) to quickly scan."
                    ><input
                        type="radio"
                        analytics-name="de-gene-link"
                        style={{ 'margin-right': '10px' }}
                        name="selected-gene-differential-expression"
                        onClick={event => {
                          searchGenes([deGene.name])
                        // event.preventDefault()
                        }}/>{
                        deGene.name
                      }</label></td>
                  <td>{deGene.log2FoldChange}</td>
                  <td>{deGene.pvalAdj}</td>
                </tr>)
            })}
          </tbody>
        </table>
        15 most DE genes <span style={{ 'color': '#CCC' }}>|</span>&nbsp;
        <a href={deFileUrl}><FontAwesomeIcon className="icon-left" icon={faDownload}/>Download all</a><br/><br/>
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
        style={{ 'float': 'left' }}>
        <FontAwesomeIcon icon={faArrowLeft}/>
      </button>
      <span style={{ 'margin-left': '25px' }}>Differential expression</span>
      <button className="action"
        onClick={toggleViewOptions}
        title="Hide options"
        data-analytics-name="view-options-hide"
        style={{ 'float': 'right' }}>
        <FontAwesomeIcon className="fa-lg" icon={faTimes}/>
      </button>
    </>
  )
}
