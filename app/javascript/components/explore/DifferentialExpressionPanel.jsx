
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faTimes, faDownload, faInfoCircle } from '@fortawesome/free-solid-svg-icons'

import DifferentialExpressionGroupPicker from '~/components/visualization/controls/DifferentialExpressionGroupPicker'
import { logSearchFromDifferentialExpression } from '~/lib/search-metrics'

const numSelectionEventsSincePageView = 0
let timeLastSelection

/** Return selected annotation object, including its `values` a.k.a. groups */
function getAnnotationObject(exploreParamsWithDefaults, exploreInfo) {
  const selectedAnnotation = exploreParamsWithDefaults?.annotation
  return exploreInfo.annotationList.annotations.find(thisAnnotation => {
    return (
      thisAnnotation.name === selectedAnnotation.name &&
      thisAnnotation.type === selectedAnnotation.type &&
      thisAnnotation.scope === selectedAnnotation.scope
    )
  })
}

/** Differential expression panel shown at right in Explore tab */
export default function DifferentialExpressionPanel({
  deGroup, deGenes, deFileUrl, searchGenes,
  exploreInfo, exploreParamsWithDefaults, setShowDeGroupPicker, setDeGenes, setDeGroup, setDeFileUrl
}) {
  const clusterName = exploreParamsWithDefaults?.cluster
  const bucketId = exploreInfo?.bucketId
  const annotation = getAnnotationObject(exploreParamsWithDefaults, exploreInfo)

  return (
    <>
      <DifferentialExpressionGroupPicker
        bucketId={bucketId}
        clusterName={clusterName}
        annotation={annotation}
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
          {/* <a href={deFileUrl}
            target="_blank"
            data-analytics-name="differential-expression-download"
            data-toggle="tooltip"
            data-original-title="Download all DE genes data for this group"
          >
            <FontAwesomeIcon icon={faDownload}/></a> */}
          <a href="https://singlecell.zendesk.com/hc/en-us/articles/6059411840027"
            target="_blank"
            data-analytics-name="differential-expression-docs"
            style={{ 'marginLeft': '10px' }}
            data-toggle="tooltip"
            data-original-title="Learn about SCP DE genes analysis"
          >
            <FontAwesomeIcon
              className="action help-icon" icon={faInfoCircle}
            />
          </a>
        </span>
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
                    <label
                      title="Click to view gene expression.  Arrow down (↓) and up (↑) to quickly scan."
                    ><input
                        type="radio"
                        analytics-name="de-gene-link"
                        name="selected-gene-differential-expression"
                        onClick={event => {
                          searchGenes([deGene.name])

                          // Log this search to Mixpanel
                          const speciesList = exploreInfo?.taxonNames
                          const rank = i
                          logSearchFromDifferentialExpression(
                            event, deGene, speciesList, rank,
                            clusterName, annotation.name
                          )
                        }}/>
                      {deGene.name}</label></td>
                  <td>{deGene.log2FoldChange}</td>
                  <td>{deGene.pvalAdj}</td>
                </tr>)
            })}
          </tbody>
        </table>
        <a href="https://forms.gle/WJJ3mtsMgdkNkX4A7" target="_blank" title="Take a 1 minute survey">
            Help improve this new feature
        </a>
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
