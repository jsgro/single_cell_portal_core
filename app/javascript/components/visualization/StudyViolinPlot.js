import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'
import _capitalize from 'lodash/capitalize'
import { fetchExpressionViolin } from 'lib/scp-api'
import { renderViolinPlot } from 'lib/violin-plot'

/** displays a violin plot of expression data for the given gene and study
 * @param studyAccession {String} the study accession
 * @param genes {Array[String]} array of gene names
 * @param renderParams {Object} object specifying cluster, annotation, subsample and consensus
 *   this is the same object returned/maintained by ClusterControls
 * @param setAnnotationList {function} for global gene search and other places where a single call is used to
 *   fetch both the default expression data and the cluster menu options, a function that will be
 *   called with the annotationList returned by that call.
  */
export default function StudyViolinPlot({ studyAccession, genes, renderParams, setAnnotationList }) {
  const [isLoading, setIsLoading] = useState(false)
  // array of gene names as they are listed in the study itself
  const [studyGeneNames, setStudyGeneNames] = useState([])
  const [graphElementId] = useState(_uniqueId('study-violin-'))

  /** gets expression data from the server */
  async function loadData() {
    setIsLoading(true)
    const results = await fetchExpressionViolin(
      studyAccession,
      genes,
      renderParams.cluster,
      renderParams.annotation.name,
      renderParams.annotation.type,
      renderParams.annotation.scope,
      renderParams.subsample,
      renderParams.consensus
    )
    setIsLoading(false)
    setStudyGeneNames(results.gene_names)
    renderViolinPlot(graphElementId, results)
    if (setAnnotationList) {
      setAnnotationList(results.annotation_list)
    }
  }
  /** handles fetching the expression data (and menu option data) from the server */
  useEffect(() => {
    if (!isLoading && renderParams.isUserUpdated !== false) {
      loadData()
    }
  }, [ // do a load from the server if any of the paramenters passed to fetchExpressionViolin have changed
    studyAccession,
    genes[0],
    renderParams.cluster,
    renderParams.annotation.name,
    renderParams.annotation.scope,
    renderParams.subsample,
    renderParams.consensus
  ])
  const isCollapsedView = ['mean', 'median'].indexOf(renderParams.consensus) >= 0
  return (
    <>
      <div
        className="expression-graph"
        id={graphElementId}
        data-testid={graphElementId}
      >
      </div>
      {
        isLoading &&
        <FontAwesomeIcon
          icon={faDna}
          data-testid={`${graphElementId}-loading-icon`}
          className="gene-load-spinner"
        />
      }
      {/* we have to explicitly test length > 0 below, just asserting .length would
       sometimes render a zero to the page*/}
      { isCollapsedView && studyGeneNames.length > 0 &&
        <div className="text-center">
          <span>{_capitalize(renderParams.consensus)} expression of {studyGeneNames.join(', ')}</span>
        </div>
      }
    </>
  )
}
