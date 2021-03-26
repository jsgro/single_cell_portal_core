import React, { useState } from 'react'
import _clone from 'lodash/clone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

import StudyGeneField from './StudyGeneField'
import ScatterPlot from 'components/visualization/ScatterPlot'
import StudyViolinPlot from 'components/visualization/StudyViolinPlot'
import DotPlot from 'components/visualization/DotPlot'
import Heatmap from 'components/visualization/Heatmap'
import GenomeView from './GenomeView'
import { getAnnotationValues } from 'lib/cluster-utils'
import RelatedGenesIdeogram from 'components/visualization/RelatedGenesIdeogram'
import InferCNVIdeogram from 'components/visualization/InferCNVIdeogram'
import useResizeEffect from 'hooks/useResizeEffect'

const tabList = [
  { key: 'cluster', label: 'Cluster' },
  { key: 'scatter', label: 'Scatter' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'dotplot', label: 'Dot Plot' },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'spatial', label: 'Spatial' },
  { key: 'genome', label: 'Genome' },
  { key: 'infercnv-genome', label: 'Genome (inferCNV)' }
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
    studyAccession, exploreInfo, exploreParams, controlExploreParams, updateExploreParams,
    isCellSelecting, plotPointsSelected, showViewOptionsControls
  }
) {
  const [, setRenderForcer] = useState({})
  const plotContainerClass = 'explore-plot-tab-content'
  const { enabledTabs, isGeneList, isGene, isMultiGene, hasIdeogramOutputs } = getEnabledTabs(exploreInfo, exploreParams)

  // exploreParams object without genes specified, to pass to cluster comparison plots
  const referencePlotDataParams = _clone(exploreParams)
  referencePlotDataParams.genes = []

  /** helper function so that StudyGeneField doesn't have to see the full exploreParams object */
  function searchGenes(genes, logProps, wasUserSpecified=true) {
    // also unset any selected gene lists or ideogram files
    updateExploreParams({ genes, geneList: '', ideogramFileId: '' }, wasUserSpecified)
  }

  // Handle spatial transcriptomics data
  let hasSelectedSpatialGroup = false
  let spatialDataParamsArray = []
  const spatialRefPlotDataParamsArray = []
  if (exploreInfo) {
    if (exploreParams.spatialGroups[0]) {
      hasSelectedSpatialGroup = true

      if (isMultiGene && !exploreParams.consensus) {
        const refPlotDataParams = _clone(exploreParams)
        refPlotDataParams.cluster = exploreParams.spatialGroups[0]
        refPlotDataParams.genes = []
        spatialRefPlotDataParamsArray.push(refPlotDataParams)
        // for each gene, create a dataParams object that can be used to generate the spatial plot
        // for that gene
        spatialDataParamsArray = exploreParams.genes.map(gene => {
          const geneSpatialParams = _clone(refPlotDataParams)
          geneSpatialParams.genes = [gene]
          return geneSpatialParams
        })
      } else {
        // for each selected spatial group,
        exploreParams.spatialGroups.forEach(group => {
          const geneSpatialParams = _clone(exploreParams)
          geneSpatialParams.cluster = group
          spatialDataParamsArray.push(geneSpatialParams)
          const spatialRefParams = _clone(geneSpatialParams)
          spatialRefParams.genes = []
          spatialRefPlotDataParamsArray.push(spatialRefParams)
        })
      }
    }
  }

  let shownTab = exploreParams.tab
  if (!enabledTabs.includes(shownTab)) {
    shownTab = enabledTabs[0]
  }
  let showRelatedGenesIdeogram = false
  let currentTaxon = null
  let searchedGene = null
  if (
    exploreInfo &&
    exploreInfo.taxonNames.length === 1 &&
    exploreParams.genes.length === 1 &&
    !isGeneList
  ) {
    showRelatedGenesIdeogram = true
    currentTaxon = exploreInfo.taxonNames[0]
    searchedGene = exploreParams.genes[0]
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

  /** helper function for Scatter plot color updates */
  function updateScatterColor(color) {
    updateExploreParams({ scatterColor: color }, false)
  }

  /** on window resize call setRenderForcer, which is just trivial state to ensure a re-render
   * ensuring that the plots get passed fresh dimensions */
  useResizeEffect(() => {
    setRenderForcer({})
  }, 300)

  return (
    <>
      <div className="row">
        <div className="col-md-6">
          <div className="flexbox">
            <StudyGeneField genes={exploreParams.genes}
              searchGenes={searchGenes}
              allGenes={exploreInfo ? exploreInfo.uniqueGenes : []}/>
            <button className={isGene || isGeneList || hasIdeogramOutputs ? 'action fa-lg' : 'hidden'} // show if this is gene search || gene list
              onClick={() => searchGenes([])}
              title="Return to cluster view"
              data-toggle="tooltip"
              data-analytics-name="back-to-cluster-view">
              <FontAwesomeIcon icon={faArrowLeft}/>
            </button>
          </div>
        </div>
        <div className="col-md-5 col-md-offset-1">
          <ul className="nav nav-tabs" role="tablist" data-analytics-name="explore-default">
            { enabledTabs.map(tabKey => {
              const label = tabList.find(({ key }) => key === tabKey).label
              return (
                <li key={tabKey} role="presentation" className={`study-nav ${tabKey === shownTab ? 'active' : ''} ${tabKey}-tab-anchor`}>
                  <a onClick={() => updateExploreParams({ tab: tabKey })}>{label}</a>
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
                    {...exploreParams}
                    updateScatterColor={updateScatterColor}
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
                          {...params}
                          updateScatterColor={updateScatterColor}
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
                    {...exploreParams}
                    updateScatterColor={updateScatterColor}
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
                    {...referencePlotDataParams}
                    updateScatterColor={updateScatterColor}
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
                        {...spatialDataParamsArray[index]}
                        updateScatterColor={updateScatterColor}
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
                        {...params}
                        updateScatterColor={updateScatterColor}
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
                        {...spatialRefPlotDataParamsArray[0]}
                        updateScatterColor={updateScatterColor}
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
                      {...spgDataParams}
                      updateScatterColor={updateScatterColor}
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
                updateDistributionPlot={distributionPlot => updateExploreParams({ distributionPlot }, false)}
                dimensions={getPlotDimensions({})}
                {...exploreParams}/>
            </div>
          }
          { enabledTabs.includes('dotplot') &&
            <div className={shownTab === 'dotplot' ? '' : 'hidden'}>
              <DotPlot
                studyAccession={studyAccession}
                {...controlExploreParams}
                annotationValues={getAnnotationValues(
                  controlExploreParams?.annotation,
                  controlExploreParams?.annotationList?.annotations
                )}
                dimensions={getPlotDimensions({})}
              />
            </div>
          }
          { enabledTabs.includes('heatmap') &&
            <div className={shownTab === 'heatmap' ? '' : 'hidden'}>
              <Heatmap
                studyAccession={studyAccession}
                {...controlExploreParams}
                dimensions={getPlotDimensions({})}/>
            </div>
          }
          { enabledTabs.includes('genome') &&
            <div className={shownTab === 'genome' ? '' : 'hidden'}>
              <GenomeView
                studyAccession={studyAccession}
                bamFileName={exploreParams.bamFileName}
                isVisible={shownTab === 'genome'}
                updateExploreParams={updateExploreParams}/>
            </div>
          }
          { enabledTabs.includes('infercnv-genome') &&
          <div className={shownTab === 'infercnv-genome' ? '' : 'hidden'}>
            <InferCNVIdeogram
              studyAccession={studyAccession}
              ideogramFileId={exploreParams?.ideogramFileId}
              inferCNVIdeogramFiles={exploreInfo.inferCNVIdeogramFiles}
              showViewOptionsControls={showViewOptionsControls}
            />
          </div>
          }
        </div>
      </div>
    </>
  )
}

/** return an array of the tabs that should be shown, given the exploreParams and exploreInfo */
export function getEnabledTabs(exploreInfo, exploreParams) {
  const isGeneList = !!exploreParams.geneList
  const isMultiGene = exploreParams?.genes?.length > 1
  const isGene = exploreParams?.genes?.length > 0
  const isConsensus = !!exploreParams.consensus
  const hasClusters = exploreInfo && exploreInfo.clusterGroupNames.length > 0
  const hasSpatialGroups = exploreInfo && exploreInfo?.spatialGroups?.length > 0
  const hasGenomeFiles = exploreInfo && exploreInfo?.bamBundleList?.length > 0
  const hasIdeogramOutputs = !!exploreInfo?.inferCNVIdeogramFiles
  let enabledTabs = []
  if (isGeneList) {
    enabledTabs = ['heatmap']
  } else if (isGene) {
    if (isMultiGene) {
      if (isConsensus) {
        enabledTabs = ['scatter', 'distribution', 'dotplot']
      } else if (hasSpatialGroups) {
        enabledTabs = ['spatial', 'dotplot', 'heatmap']
      } else {
        enabledTabs = ['dotplot', 'heatmap']
      }
    } else {
      enabledTabs = ['scatter', 'distribution']
    }
  } else if (hasClusters) {
    enabledTabs = ['cluster']
  }
  if (hasGenomeFiles) {
    enabledTabs.push('genome')
  }
  if (hasIdeogramOutputs) {
    enabledTabs.push('infercnv-genome')
  }
  return { enabledTabs, isGeneList, isGene, isMultiGene, hasIdeogramOutputs }
}
