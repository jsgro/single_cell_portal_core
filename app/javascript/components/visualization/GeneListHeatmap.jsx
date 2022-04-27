import React, { useState, useEffect, useRef } from 'react'
import _uniqueId from 'lodash/uniqueId'

import { log } from '~/lib/metrics-api'
import { renderHeatmap, refitHeatmap } from '~/lib/morpheus-heatmap'
import { getExpressionHeatmapURL, getGeneListColsURL } from '~/lib/scp-api'
import PlotUtils from '~/lib/plot'
const { dotPlotColorScheme } = PlotUtils
import { useUpdateEffect } from '~/hooks/useUpdate'
import useErrorMessage from '~/lib/error-message'
import { withErrorBoundary } from '~/lib/ErrorBoundary'
import LoadingSpinner from '~/lib/LoadingSpinner'


/** renders a morpheus powered heatmap for the given params
  * @param genes {Array[String]} array of gene names
  * @param cluster {string} the name of the cluster, or blank/null for the study's default
  * @param annotation {obj} an object with name, type, and scope attributes
  * @param subsample {string} a string for the subsampel to be retrieved.
  * @param geneList {string} a string for the gene list (precomputed score) to be retrieved.
 */
function RawGeneListHeatmap({
  studyAccession, geneList: geneListName,
  geneLists=[], heatmapFit, heatmapRowCentering
}) {
  const [graphId] = useState(_uniqueId('heatmap-'))
  const morpheusHeatmap = useRef(null)
  let expressionValuesURL = getExpressionHeatmapURL({
    studyAccession,
    heatmapRowCentering,
    geneList: geneListName
  })
  const { ErrorComponent, setShowError, setErrorContent } = useErrorMessage()
  // we can't render until we know what the cluster is, since morpheus requires the annotation name
  // so don't try until we've received this, unless we're showing a Gene List
  const canRender = !!geneListName && geneLists.length
  const isCustomScaling = heatmapRowCentering === true || heatmapRowCentering === 'true'
  const geneListInfo = geneLists.find(gl => gl.name === geneListName)
  const description = geneListInfo?.description
  const yAxisLabel = geneListInfo?.y_axis_label
  const annotationCellValuesURL = getGeneListColsURL({ studyAccession, geneList: geneListName })
  const colorMin = isCustomScaling ? geneListInfo.heatmap_file_info?.color_min : null
  const colorMax = isCustomScaling ? geneListInfo.heatmap_file_info?.color_max : null
  // For baffling reasons, morpheus will not render a geneList heatmap correctly unless
  // there is another parameter on the query string. Despite the fact that I've confirmed the
  // server responses are identical with/without the extra param.
  expressionValuesURL = `${expressionValuesURL}&z=1`

  useEffect(() => {
    performance.mark(`perfTimeStart-${graphId}`)

    log('heatmap:initialize')
    setShowError(false)
    morpheusHeatmap.current = renderHeatmap({
      target: `#${graphId}`,
      expressionValuesURL,
      annotationCellValuesURL,
      annotationName: geneListName,
      fit: heatmapFit,
      rowCentering: heatmapRowCentering,
      sortColumns: false,
      setShowError,
      setErrorContent,
      colorMin,
      colorMax
    })
  }, [
    studyAccession,
    heatmapRowCentering,
    geneListName
  ])

  useUpdateEffect(() => {
    refitHeatmap(morpheusHeatmap?.current)
  }, [heatmapFit])


  return (
    <div>
      <div>
        <h5 className="text-center heatmap-title">{geneListName}</h5>
        <div className="text-center"> { description } </div>
      </div>
      <div className="plot">
        { ErrorComponent }
        <LoadingSpinner isLoading={!canRender}>
          <div id={graphId} className="heatmap-graph" style={{ minWidth: '80vw' }}></div>

        </LoadingSpinner>
        <HeatmapLegend label={yAxisLabel} minLabel={colorMin ?? undefined} maxLabel={colorMax ?? undefined}/>
      </div>

    </div>
  )
}


const GeneListHeatmap = withErrorBoundary(RawGeneListHeatmap)
export default GeneListHeatmap

/** renders an svg legend for a dotplot with color and size indicators */
function HeatmapLegend({ label='Scaled expression', minLabel='min', maxLabel='max' }) {
  const gradientId = _uniqueId('heatmapGrad-')
  const colorBarWidth = 100
  const numberYPos = 54
  const labelTextYPos = 25
  const heatmapColorScheme = {
    // Blue, white, red.  These red and blue hues are accessible, per WCAG.
    colors: ['#0000BB', '#f6f6f6', '#FF0000'],
    values: [0, 0.5, 1]
  }

  return (
    <svg className="dot-plot-legend-container">
      <g className="dp-legend-color" transform="translate(200, 0)">
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {
            heatmapColorScheme.colors.map((color, i) => {
              const value = dotPlotColorScheme.values[i] * 100
              const offset = `${value}%`
              return <stop offset={offset} stopColor={color} key={i}/>
            })
          }
        </linearGradient>
        <text x="0" y={labelTextYPos}>{label}</text>
        <rect fill={`url(#${gradientId})`} x="0" y="30" width={colorBarWidth} height="14"/>
        <text x="-1" y={numberYPos}>{minLabel}</text>
        <text x={colorBarWidth - 25} y={numberYPos}>{maxLabel}</text>

      </g>
    </svg>
  )
}
