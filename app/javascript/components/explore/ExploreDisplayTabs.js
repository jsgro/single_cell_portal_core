import React, { useState } from 'react'
import _clone from 'lodash/clone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

import StudyGeneField from './StudyGeneField'
import ScatterTab from './ScatterTab'
import StudyViolinPlot from 'components/visualization/StudyViolinPlot'
import DotPlot from 'components/visualization/DotPlot'
import Heatmap from 'components/visualization/Heatmap'
import GenomeView from './GenomeView'
import { getAnnotationValues } from 'lib/cluster-utils'
import RelatedGenesIdeogram from 'components/visualization/RelatedGenesIdeogram'
import InferCNVIdeogram from 'components/visualization/InferCNVIdeogram'
import useResizeEffect from 'hooks/useResizeEffect'

const tabList = [
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
  function searchGenes(genes, logProps) {
    // also unset any selected gene lists or ideogram files
    updateExploreParams({ genes, geneList: '', ideogramFileId: '' })
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
    isTwoColumn=false,
    isMultiRow=false,
    verticalPad=250,
    horizontalPad=80,
    hasTitle=false
  }) {
    // Get width, and account for expanding "View Options" after page load
    let baseWidth = $(window).width()
    if (showViewOptionsControls) {
      baseWidth = Math.round(baseWidth * 10 / 12)
    }
    let width = (baseWidth - horizontalPad) / (isTwoColumn ? 2 : 1)

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
    if (isMultiRow) {
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
          { enabledTabs.includes('scatter') &&
            <div className={shownTab === 'scatter' ? '' : 'hidden'}>
              <ScatterTab
                {...{
                  studyAccession,
                  exploreParams,
                  updateExploreParams,
                  exploreInfo,
                  isGeneList,
                  isGene,
                  isMultiGene,
                  isCellSelecting,
                  plotPointsSelected,
                  getPlotDimensions
                }}/>
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

/**
  * return an array of the tab names that should be shown, given the exploreParams and exploreInfo
  * (note that the export is for test availability -- this funtion is not intended to be used elsewhere
  */
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
        enabledTabs = ['scatter', 'dotplot', 'heatmap']
      } else {
        enabledTabs = ['dotplot', 'heatmap']
      }
    } else {
      enabledTabs = ['scatter', 'distribution']
    }
  } else if (hasClusters) {
    enabledTabs = ['scatter']
  }
  if (hasGenomeFiles) {
    enabledTabs.push('genome')
  }
  if (hasIdeogramOutputs) {
    enabledTabs.push('infercnv-genome')
  }
  return { enabledTabs, isGeneList, isGene, isMultiGene, hasIdeogramOutputs }
}
