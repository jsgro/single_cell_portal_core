
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faTimes } from '@fortawesome/free-solid-svg-icons'

/** Differential expression panel shown at right in Explore tab */
export default function DifferentialExpressionPanel({ deGroup, deGenes, searchGenes }) {
  return (
    <>
      <p>{deGroup} vs. other groups</p>
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
              <tr key={i}>
                <td>
                  <a
                    analytics-name="de-gene-link"
                    href="#"
                    onClick={event => {
                      searchGenes([deGene.name])
                      event.preventDefault()
                    }}>{
                      deGene.name
                    }</a></td>
                <td>{deGene.log2FoldChange}</td>
                <td>{deGene.pvalAdj}</td>
              </tr>)
          })}
        </tbody>
      </table>
    </>
  )
}

/** Top matter for differential expression panel shown at right in Explore tab */
export function DifferentialExpressionPanelHeader({ toggleViewOptions, setDeGenes }) {
  return (
    <>
      <>Differential expression</>
      <button className="action"
        onClick={toggleViewOptions}
        title="Hide options"
        data-analytics-name="view-options-hide">
        <FontAwesomeIcon className="fa-lg" icon={faTimes}/>
      </button>
      <button className="action fa-lg"
        onClick={() => setDeGenes(null)}
        data-toggle="tooltip"
        title="Exit differential expression panel"
        data-analytics-name="differential-expression-panel-exit">
        <FontAwesomeIcon icon={faArrowLeft}/>
      </button>
    </>
  )
}
