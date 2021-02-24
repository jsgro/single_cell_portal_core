import React, { useState } from 'react'
import _clone from 'lodash/clone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import Select from 'react-select'

import StudyGeneField from './StudyGeneField'
import ScatterPlot from 'components/visualization/ScatterPlot'
import StudyViolinPlot from 'components/visualization/StudyViolinPlot'
import DotPlot from 'components/visualization/DotPlot'
import Heatmap from 'components/visualization/Heatmap'
import { getAnnotationValues } from 'lib/cluster-utils'
import RelatedGenesIdeogram from 'components/visualization/RelatedGenesIdeogram'
import useResizeEffect from 'hooks/useResizeEffect'

const tabList = [
  { key: 'cluster', label: 'Cluster' },
  { key: 'scatter', label: 'Scatter' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'dotplot', label: 'Dot Plot' },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'spatial', label: 'Spatial' }
]

const ideogramHeight = 140

/**
 * Renders the gene search box and the tab selection
 * Responsible for determining which tabs are available for a given view of the study
 *
 * We want to mount all components that are enabled, so they can fetch their data and persist
 * even when they are not currently in view. We don't want to mount non-enabled components
 * as their display doesn't make sense with the current dataParams, and so they will
 * need to re-render on dataParams change anyway
 *
 * @param {String} studyAccession  the study accession to visualize
 * @param {Object} exploreInfo  the object returned from a call to api/v1/studies/{study}/visualization/explore
 * @param {Object} dataParams  object with cluster, annotation, and other viewing properties specified.
 * @param { Function } updateDataParams function for passing updates to the dataParams object
 */
export default function ExploreDisplayTabs(
  {
    studyAccession, exploreInfo, dataParams, controlDataParams, renderParams,
    updateDataParams, updateRenderParams, isCellSelecting, plotPointsSelected, showViewOptionsControls
  }
) {
  const [, setRenderForcer] = useState({})
  const isMultiGene = dataParams.genes.length > 1
  const isGene = dataParams.genes.length > 0
  const plotContainerClass = 'explore-plot-tab-content'
  let enabledTabs = []

  if (isGene) {
    if (isMultiGene) {
      if (dataParams.consensus) {
        enabledTabs = ['scatter', 'distribution', 'dotplot']
      } else {
        enabledTabs = ['dotplot', 'heatmap']
      }
    } else {
      enabledTabs = ['scatter', 'distribution']
    }
  } else {
    enabledTabs = ['cluster']
  }

  // dataParams object without genes specified, to pass to cluster comparison plots
  const referencePlotDataParams = _clone(dataParams)
  referencePlotDataParams.genes = []

  /** helper function so that StudyGeneField doesn't have to see the full dataParams object */
  function searchGenes(genes, logProps) {
    const trigger = logProps ? logProps.type : 'clear'

    // Properties logged for all gene searches from Study Overview
    const defaultLogProps = {
      type: 'gene',
      context: 'study',
      genes,
      numGenes: genes.length,
      trigger, // "submit", "click", or "click-related-genes"
      speciesList: exploreInfo.taxonNames
    }

    // Merge log props from custom event
    if (trigger === 'click-related-genes') {
      Object.assign(logProps, defaultLogProps)
    }

    // TODO: Log study gene search, to not break existing analytics
    // Avoid logging `clear` trigger; it is not a search

    updateDataParams({ genes })
  }

  // Handle spatial transcriptomics data
  let hasSpatialGroups = false
  let hasSelectedSpatialGroup = false
  let spatialDataParamsArray = []
  const spatialRefPlotDataParamsArray = []
  if (exploreInfo) {
    hasSpatialGroups = exploreInfo.spatialGroups.length > 0

    if (dataParams.spatialGroups[0]) {
      hasSelectedSpatialGroup = true

      if (isMultiGene && !dataParams.consensus) {
        const refPlotDataParams = _clone(dataParams)
        refPlotDataParams.cluster = dataParams.spatialGroups[0]
        refPlotDataParams.genes = []
        spatialRefPlotDataParamsArray.push(refPlotDataParams)
        // for each gene, create a dataParams object that can be used to generate the spatial plot
        // for that gene
        spatialDataParamsArray = dataParams.genes.map(gene => {
          const geneSpatialParams = _clone(refPlotDataParams)
          geneSpatialParams.genes = [gene]
          return geneSpatialParams
        })
      } else {
        // for each selected spatial group,
        dataParams.spatialGroups.forEach(group => {
          const geneSpatialParams = _clone(dataParams)
          geneSpatialParams.cluster = group
          spatialDataParamsArray.push(geneSpatialParams)
          const spatialRefParams = _clone(geneSpatialParams)
          spatialRefParams.genes = []
          spatialRefPlotDataParamsArray.push(spatialRefParams)
        })
      }
    }
    if (hasSpatialGroups && isMultiGene && !dataParams.consensus) {
      enabledTabs.unshift('spatial')
    }
  }

  let shownTab = renderParams.tab
  if (!enabledTabs.includes(shownTab)) {
    shownTab = enabledTabs[0]
  }
  let showRelatedGenesIdeogram = false
  let currentTaxon = null
  let searchedGene = null
  if (
    exploreInfo &&
    exploreInfo.taxonNames.length === 1 &&
    dataParams.genes.length === 1
  ) {
    showRelatedGenesIdeogram = true
    currentTaxon = exploreInfo.taxonNames[0]
    searchedGene = dataParams.genes[0]
  }

  /** Get width and height available for plot components, since they may be first rendered hidden */
  function getPlotDimensions({
    numColumns=1,
    numRows=1,
    verticalPad=250,
    horizontalPad=80,
    hasTitle=false
  }) {
    // Get width, and account for expanding "View Options" after page load
    let baseWidth = $(window).width()
    if (showViewOptionsControls) {
      baseWidth = Math.round(baseWidth * 10 / 12)
    }
    let width = (baseWidth - horizontalPad) / numColumns

    // Get height
    // Height of screen viewport, minus fixed-height elements above gallery
    let galleryHeight = $(window).height() - verticalPad
    if (showRelatedGenesIdeogram) {
      galleryHeight -= ideogramHeight
    }
    if (hasTitle) {
      galleryHeight -= 20
    }
    let height = galleryHeight
    if (numRows > 1) {
      // Fill as much gallery height as possible, but show tip of next row
      // as an affordance that the gallery is vertically scrollable.
      const secondRowTipHeight = 70
      height = height - secondRowTipHeight
    }
    // ensure aspect ratio isn't too distorted
    if (height > width * 1.3) {
      height = Math.round(width * 1.3)
    }

    // Ensure plots aren't too small.
    // This was needed as of 2020-12-14 to avoid a Plotly error in single-gene
    // view: "Something went wrong with axes scaling"
    height = Math.max(height, 200)
    width = Math.max(width, 200)

    return { width, height }
  }

  /** on window resize call setRenderForcer, which is just trivial state to ensure a re-render
   * ensuring that the plots get passed fresh dimensions */
  useResizeEffect(() => {
    setRenderForcer({})
  }, 300)
  console.log('rerendering ExploreDisplayTabs')

  return (
    <>
      <div className="row">
        <div className="col-md-5">
          <div className="flexbox">
            <StudyGeneField genes={dataParams.genes}
              searchGenes={searchGenes}
              allGenes={exploreInfo ? exploreInfo.uniqueGenes : []}/>
            <button className={isGene ? 'action fa-lg' : 'hidden'}
              onClick={() => searchGenes([])}
              title="Return to cluster view"
              data-toggle="tooltip"
              data-analytics-name="back-to-cluster-view">
              <FontAwesomeIcon icon={faArrowLeft}/>
            </button>
          </div>
        </div>
        <div className="col-md-4 col-md-offset-1">
          <ul className="nav nav-tabs" role="tablist" data-analytics-name="explore-default">
            { enabledTabs.map(tabKey => {
              const label = tabList.find(({ key }) => key === tabKey).label
              return (
                <li key={tabKey} role="presentation" className={`study-nav ${tabKey === shownTab ? 'active' : ''}`}>
                  <a onClick={() => updateRenderParams({ tab: tabKey })}>{label}</a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="row">
        <div className="explore-plot-tab-content">
          { showRelatedGenesIdeogram &&
            <RelatedGenesIdeogram
              gene={searchedGene}
              taxon={currentTaxon}
              target={`.${plotContainerClass}`}
              height={ideogramHeight}
              genesInScope={exploreInfo.uniqueGenes}
              searchGenes={searchGenes}
            />
          }
          { enabledTabs.includes('cluster') &&
            <div className={shownTab === 'cluster' ? '' : 'hidden'}>
              <div className="row">
                <div className={hasSelectedSpatialGroup ? 'col-md-6' : 'col-md-12'}>
                  <ScatterPlot
                    studyAccession={studyAccession}
                    dataParams={dataParams}
                    renderParams={renderParams}
                    updateRenderParams={updateRenderParams}
                    dimensions={getPlotDimensions({
                      numColumns: hasSelectedSpatialGroup ? 2 : 1,
                      hasTitle: true
                    })}
                    isCellSelecting={isCellSelecting}
                    plotPointsSelected={plotPointsSelected}
                  />
                </div>
                <div className={hasSelectedSpatialGroup ? 'col-md-6' : 'hidden'}>
                  { hasSelectedSpatialGroup &&
                    spatialRefPlotDataParamsArray.slice(0, 5).map((params, index) =>
                      <div key={params.cluster}>
                        <ScatterPlot
                          studyAccession={studyAccession}
                          dataParams={params}
                          renderParams={renderParams}
                          updateRenderParams={updateRenderParams}
                          dimensions={getPlotDimensions({ numColumns: 2, hasTitle: true })}
                          isCellSelecting={isCellSelecting}
                          plotPointsSelected={plotPointsSelected}
                        />
                      </div>
                    )
                  }
                  { (hasSelectedSpatialGroup && spatialRefPlotDataParamsArray.length > 5) &&
                    <div className="detail">
                      Only the first five selected spatial groups are shown.
                      Deselect some spatial groups to see the remainder
                    </div>
                  }
                </div>
              </div>
            </div>
          }
          { enabledTabs.includes('scatter') &&
            <div className={shownTab === 'scatter' ? '' : 'hidden'}>
              <div className="row">
                <div className="col-md-6">
                  <ScatterPlot
                    studyAccession={studyAccession}
                    dataParams={dataParams}
                    renderParams={renderParams}
                    updateRenderParams={updateRenderParams}
                    dimensions={getPlotDimensions({
                      numColumns: 2,
                      numRows: hasSelectedSpatialGroup ? 2 : 1,
                      hasTitle: true,
                      showRelatedGenesIdeogram
                    })}
                    isCellSelecting={isCellSelecting}
                    plotPointsSelected={plotPointsSelected}
                  />
                </div>
                <div className="col-md-6">
                  <ScatterPlot
                    studyAccession={studyAccession}
                    dataParams={referencePlotDataParams}
                    renderParams={renderParams}
                    updateRenderParams={updateRenderParams}
                    dimensions={getPlotDimensions({
                      numColumns: 2,
                      numRows: hasSelectedSpatialGroup ? 2 : 1,
                      hasTitle: true,
                      showRelatedGenesIdeogram
                    })}
                    isCellSelecting={isCellSelecting}
                    plotPointsSelected={plotPointsSelected}
                  />
                </div>
              </div>
              { hasSelectedSpatialGroup &&
                spatialRefPlotDataParamsArray.slice(0, 3).map((params, index) =>
                  <div key={index} className="row">
                    <div className="col-md-6">
                      <ScatterPlot
                        studyAccession={studyAccession}
                        dataParams={spatialDataParamsArray[index]}
                        renderParams={renderParams}
                        updateRenderParams={updateRenderParams}
                        dimensions={getPlotDimensions({
                          numColumns: 2,
                          numRows: 2,
                          hasTitle: true,
                          showRelatedGenesIdeogram
                        })}
                        isCellSelecting={isCellSelecting}
                        plotPointsSelected={plotPointsSelected}
                      />
                    </div>
                    <div className="col-md-6">
                      <ScatterPlot
                        studyAccession={studyAccession}
                        dataParams={params}
                        renderParams={renderParams}
                        updateRenderParams={updateRenderParams}
                        dimensions={getPlotDimensions({
                          numColumns: 2,
                          numRows: 2,
                          hasTitle: true,
                          showRelatedGenesIdeogram
                        })}
                        isCellSelecting={isCellSelecting}
                        plotPointsSelected={plotPointsSelected}
                      />
                    </div>
                  </div>)
              }
              { (hasSelectedSpatialGroup && spatialRefPlotDataParamsArray.length > 5) &&
                <div className="detail">
                  Spatial plots are only rendered for the first three selected spatial groups.<br/>
                  Deselect some groups to see the others
                </div>
              }
            </div>
          }
          { enabledTabs.includes('spatial') &&
            <div className={shownTab === 'spatial' ? '' : 'hidden'}>
              <div className="row">
                <div className="col-md-10 col-md-offset-1">
                  { hasSelectedSpatialGroup &&
                    <div>
                      <ScatterPlot
                        studyAccession={studyAccession}
                        dataParams={spatialRefPlotDataParamsArray[0]}
                        renderParams={renderParams}
                        updateRenderParams={updateRenderParams}
                        dimensions={getPlotDimensions({ numColumns: 1, numRows: 2, hasTitle: true })}
                        isCellSelecting={isCellSelecting}
                        plotPointsSelected={plotPointsSelected}
                      />
                    </div>
                  }
                  { !hasSelectedSpatialGroup &&
                    <div className="message-text">
                      <span>To view spatially-oriented gene expression,
                      use the &quot;Spatial Groups&quot; control in View Options</span>
                    </div>
                  }
                </div>
              </div>
              <div className="row">
                { spatialDataParamsArray.map((spgDataParams, index) => {
                  return <div key={index} className="col-md-6">
                    <ScatterPlot
                      studyAccession={studyAccession}
                      dataParams={spgDataParams}
                      renderParams={renderParams}
                      updateRenderParams={updateRenderParams}
                      dimensions={getPlotDimensions({ numColumns: 2, numRows: 2, hasTitle: true })}
                      isCellSelecting={isCellSelecting}
                      plotPointsSelected={plotPointsSelected}
                    />
                  </div>
                })}
                { (hasSelectedSpatialGroup && spatialDataParamsArray.length > 5) &&
                  <div className="detail">
                    Spatial plots are only rendered for the first 5 searched genes.<br/>
                    Remove some genes from your search to see plots for the others.
                  </div>
                }
              </div>
            </div>
          }
          { enabledTabs.includes('distribution') &&
            <div className={shownTab === 'distribution' ? '' : 'hidden'}>
              <StudyViolinPlot
                studyAccession={studyAccession}
                dataParams={dataParams}
                renderParams={renderParams}
                updateRenderParams={updateRenderParams}
                genes={dataParams.genes}/>
            </div>
          }
          { enabledTabs.includes('dotplot') &&
            <div className={shownTab === 'dotplot' ? '' : 'hidden'}>
              <DotPlotTab
                studyAccession={studyAccession}
                dataParams={controlDataParams}
                annotations={exploreInfo ? exploreInfo.annotationList.annotations : null}
                dimensions={getPlotDimensions({})}/>
            </div>
          }
          { enabledTabs.includes('heatmap') &&
            <div className={shownTab === 'heatmap' ? '' : 'hidden'}>
              <Heatmap
                studyAccession={studyAccession}
                dataParams={controlDataParams}
                renderParams={renderParams}
                genes={dataParams.genes}
                dimensions={getPlotDimensions({})}/>
            </div>
          }
        </div>
      </div>
    </>
  )
}

/** Renders a plot title for scatter plots */
export function PlotTitle({ cluster, annotation, gene, spatial }) {
  let content
  if (spatial) {
    if (gene) {
      content = <span className="cluster-title">{spatial} <span className="detail">{gene} expression</span></span>
    } else {
      content = <span className="cluster-title">{spatial} <span className="detail">(spatial)</span></span>
    }
  } else if (!gene) {
    content = <span className="cluster-title">{cluster}</span>
  } else {
    content = <span className="cluster-title">{gene} expression</span>
  }
  return <h5 className="plot-title">{ content } </h5>
}

/** renders the dot plot tab for multi gene searches */
function DotPlotTab({ studyAccession, dataParams, annotations, widthFunc }) {
  const annotationValues = getAnnotationValues(dataParams.annotation, annotations)
  return (<DotPlot
    studyAccession={studyAccession}
    dataParams={dataParams}
    genes={dataParams.genes}
    annotationValues={annotationValues}
    widthFunc={widthFunc}
  />)
}

