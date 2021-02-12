import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'
import _capitalize from 'lodash/capitalize'
import { fetchExpressionViolin } from 'lib/scp-api'
import { getColorBrewerColor, arrayMin, arrayMax, plotlyDefaultLineColor } from 'lib/plot'
import { useUpdateEffect } from 'hooks/useUpdate'

export const DISTRIBUTION_PLOT_OPTIONS = [
  { label: 'Violin plot', value: 'violin' },
  { label: 'Box plot', value: 'box' }
]
export const defaultDistributionPlot = DISTRIBUTION_PLOT_OPTIONS[0].value

/** displays a violin plot of expression data for the given gene and study
 * @param studyAccession {String} the study accession
 * @param genes {Array[String]} array of gene names
 * @param dataParams {Object} object specifying cluster, annotation, subsample and consensus
 *   this is typically maintained by ClusterControls
 * @param renderParams {Object} object specifying plot type, annotations, and whetehr to render points
 *   this is ttypically maintained by RenderControls
 * @param setAnnotationList {function} for global gene search and other places where a single call is used to
 *   fetch both the default expression data and the cluster menu options, a function that will be
 *   called with the annotationList returned by that call.
  */
export default function StudyViolinPlot({
  studyAccession, genes, dataParams, renderParams={}, updateRenderParams, setAnnotationList
}) {
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
      dataParams.cluster,
      dataParams.annotation.name,
      dataParams.annotation.type,
      dataParams.annotation.scope,
      dataParams.subsample,
      dataParams.consensus
    )
    setIsLoading(false)
    setStudyGeneNames(results.gene_names)
    let distributionPlot = results.plotType
    if (renderParams.distributionPlot) {
      distributionPlot = renderParams.distributionPlot
    } else {
      distributionPlot = results.plotType
    }
    if (!distributionPlot) {
      distributionPlot = defaultDistributionPlot
    }
    renderViolinPlot(graphElementId, results, { plotType: distributionPlot })
    if (setAnnotationList) {
      setAnnotationList(results.annotation_list)
    }
    if (updateRenderParams) {
      updateRenderParams({ distributionPlot }, false)
    }
  }
  /** handles fetching the expression data (and menu option data) from the server */
  useEffect(() => {
    if (!isLoading && dataParams.isUserUpdated !== false) {
      loadData()
    }
  }, [ // do a load from the server if any of the paramenters passed to fetchExpressionViolin have changed
    studyAccession,
    genes[0],
    dataParams.cluster,
    dataParams.annotation.name,
    dataParams.annotation.scope,
    dataParams.subsample,
    dataParams.consensus
  ])

  // useEffect for handling render param re-renders
  useUpdateEffect(() => {
    // Don't try to update the if the data hasn't loaded yet
    if (!isLoading && studyGeneNames.length > 0) {
      window.Plotly.restyle(graphElementId, { type: renderParams.distributionPlot })
    }
  }, [renderParams.distributionPlot])

  const isCollapsedView = ['mean', 'median'].indexOf(dataParams.consensus) >= 0
  return (
    <div className="plot">
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
          <span>{_capitalize(dataParams.consensus)} expression of {studyGeneNames.join(', ')}</span>
        </div>
      }
    </div>
  )
}


/** Formats expression data for Plotly, draws violin (or box) plot */
function renderViolinPlot(target, results, { plotType }) {
  const traceData = getViolinPropsWrapper(results, plotType)
  const expressionData = [...traceData[0]]
  const expressionLayout = traceData[1]
  window.Plotly.newPlot(target, expressionData, expressionLayout)
}

/** Convenience wrapper for getViolinProps */
function getViolinPropsWrapper(rawPlot, plotType) {
  // The code below is heavily borrowed from legacy application.js
  const dataArray = parseResultsToArray(rawPlot)
  const jitter = rawPlot.values_jitter ? rawPlot.values_jitter : ''
  const traceData = getViolinProps(
    dataArray, rawPlot.rendered_cluster, jitter, rawPlot.y_axis_title, plotType
  )
  return traceData
}

/**
 * Creates Plotly traces and layout for violin plots and box plots
 *
 * Takes an array of arrays and returns the data array of traces and the
 * layout variable.  More specifically, this will:
 *
 * Iterate through the formatted array
 * [[name_of_trace, expression_data]...]
 * and create the response plotly objects,
 * returning [plotly data object, plotly layout object]
*/
function getViolinProps(
  arr, title, jitter='all', expressionLabel, plotType='violin'
) {
  let data = []
  for (let x = 0; x < arr.length; x++) {
    // Plotly violin trace creation, adding to master array
    // get inputs for plotly violin creation
    const dist = arr[x][1]
    const name = arr[x][0]

    // Replace the none selection with bool false for plotly
    if (jitter === '') {
      jitter = false
    }

    // Check if there is a distribution before adding trace
    if (arrayMax(dist) !== arrayMin(dist) && plotType === 'violin') {
      // Make a violin plot if there is a distribution
      data = data.concat([{
        type: 'violin',
        name,
        y: dist,
        points: jitter,
        pointpos: 0,
        jitter: 0.85,
        spanmode: 'hard',
        box: {
          visible: true,
          fillcolor: '#ffffff',
          width: .1
        },
        marker: {
          size: 2,
          color: '#000000',
          opacity: 0.8
        },
        fillcolor: getColorBrewerColor(x),
        line: {
          color: '#000000',
          width: 1.5
        },
        meanline: {
          visible: false
        }
      }])
    } else {
      // Make a boxplot for data with no distribution
      data = data.concat([{
        type: 'box',
        name,
        y: dist,
        boxpoints: jitter,
        marker: {
          color: getColorBrewerColor(x),
          size: 2,
          line: {
            color: plotlyDefaultLineColor
          }
        },
        boxmean: true
      }])
    }
  }

  const layout = getViolinLayout(title, expressionLabel)

  return [data, layout]
}

/** Get Plotly layout for violin plot */
function getViolinLayout(title, expressionLabel) {
  return {
    title,
    // Force axis labels, including number strings, to be treated as
    // categories.  See Python docs (same generic API as JavaScript):
    // https://plotly.com/python/axes/#forcing-an-axis-to-be-categorical
    // Relevant Plotly JS example:
    // https://plotly.com/javascript/axes/#categorical-axes
    xaxis: {
      type: 'category'
    },
    yaxis: {
      zeroline: true,
      showline: true,
      title: expressionLabel
    },
    margin: {
      pad: 10,
      b: 100
    },
    autosize: true
  }
}


/** copied from legacy application.js */
function parseResultsToArray(results) {
  const keys = Object.keys(results.values)
  return keys.sort().map(key => {
    return [key, results.values[key].y]
  })
}

