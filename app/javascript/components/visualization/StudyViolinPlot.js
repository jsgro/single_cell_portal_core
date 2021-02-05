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
 * @param renderParams {Object} object specifying cluster, annotation, subsample and collapseBy
 *   this is the same object returned/maintained by ClusterControls
 * @param setAnnotationList {function} for global gene search and other places where a single call is used to
 *   fetch both the default expression data and the cluster menu options, a function that will be
 *   called with the annotationList returned by that call.
  */
export default function StudyViolinPlot({ studyAccession, genes, renderParams, setAnnotationList }) {
  const [isLoading, setIsLoading] = useState(false)
  // array of gene names as they are listed in the study itself
  const [studyGeneNames, setStudyGeneNames] = useState([])
  /** this component has cases where it fetches state that it does not own -- specifically,
   * in global gene search, the annotation list of all the control menu options is retrieved in
   * the same call as the expression data to reduce service calls.  Then this component calls
   * setAnnotationList to pass that up to the parent and eventually the cluster control dropdowns.
   * Once received, the cluster control will then update render params as it popualtes itself with the defaults.
   * This component needs to ignore that update.
   */
  const [ignoreNextParamUpdate, setIgnoreNextParamUpdate] = useState(false)
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
      renderParams.collapseBy
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
    if (!ignoreNextParamUpdate) {
      if (!isLoading) {
        // if this is an initial render and we are responsible for loading the annotation list (e.g. global gene search)
        // ignore the follow-on param update
        if (!renderParams.cluster && setAnnotationList) {
          setIgnoreNextParamUpdate(true)
        }
        loadData()
      }
    } else {
      setIgnoreNextParamUpdate(false)
    }
  }, [ // do a load from the server if any of the paramenters passed to fetchExpressionViolin have changed
    studyAccession,
    genes[0],
    renderParams.cluster,
    renderParams.annotation.name,
    renderParams.annotation.scope,
    renderParams.subsample,
    renderParams.collapseBy
  ])
  const isCollapsedView = ['mean', 'median'].indexOf(renderParams.collapseBy) >= 0
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
          <span>{_capitalize(renderParams.collapseBy)} expression of {studyGeneNames.join(', ')}</span>
        </div>
      }
    </>
  )
}
