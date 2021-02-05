import React from 'react'
import _clone from 'lodash/clone'
import StudyGeneField from './StudyGeneField'
import ScatterPlot from 'components/visualization/ScatterPlot'
import StudyViolinPlot from 'components/visualization/StudyViolinPlot'
import StudyGeneDotPlot from 'components/visualization/StudyGeneDotPlot'
import { getAnnotationValues } from 'components/visualization/ClusterControls'

const tabList = [
  { key: 'cluster', label: 'Cluster' },
  { key: 'scatter', label: 'Scatter' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'dotplot', label: 'Dot Plot' },
  { key: 'heatmap', label: 'Heatmap' }
]

/**
 * Renders the gene search box and the tab selection
 * Responsible for determining which tabs are available for a given view of the study
 *
 * We want to mount all components that are enabled, so they can fetch their data and persist
 * even when they are not currently in view. We don't want to mount non-enabled components
 * as their display doesn't make sense with the current viewOptions, and so they will
 * need to re-render on viewOptions change anyway
 *
 * @param {String} studyAccession  the study accession to visualize
 * @param {Object} exploreInfo  the object returned from a call to api/v1/studies/{study}/visualization/explore
 * @param {Object} viewOptions  object with cluster, annotation, and other viewing properties specified.
 * @param { Function } updateViewOptions function for passing updates to the viewOptions object
 */
export default function ExploreDisplayTabs({ studyAccession, exploreInfo, viewOptions, updateViewOptions }) {
  const isMultiGene = viewOptions.genes.length > 1
  const isGene = viewOptions.genes.length > 0

  let enabledTabs = []


  if (isGene) {
    if (isMultiGene) {
      if (viewOptions.consensus) {
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

  let shownTab = viewOptions.tab
  if (!enabledTabs.includes(shownTab)) {
    shownTab = enabledTabs[0]
  }
  // viewOptions object without genes specified, to pass to cluster comparison graphs
  const genelessViewOptions = _clone(viewOptions)
  genelessViewOptions.genes = []

  /** helper function so that StudyGeneField doesn't have to see the full viewOptions object */
  function setGenes(geneString) {
    updateViewOptions({ genes: geneString })
  }
  return (
    <>
      <div className="row">
        <div className="col-md-5">
          <StudyGeneField genes={viewOptions.genes}
            setGenes={setGenes}
            allGenes={exploreInfo ? exploreInfo.uniqueGenes : []}/>
        </div>
        <div className="col-md-7">
          <ul className="nav nav-tabs" role="tablist" data-analytics-name="explore-default">
            { enabledTabs.map(tabKey => {
              const label = tabList.find(({ key }) => key === tabKey).label
              return (
                <li key={tabKey} role="presentation" className={`study-nav ${tabKey === shownTab ? 'active' : ''}`}>
                  <a onClick={() => updateViewOptions({ tab: tabKey })}>{label}</a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12 explore-plot-tab-content">
          { enabledTabs.includes('cluster') &&
            <div className={shownTab === 'cluster' ? '' : 'hidden'}>
              <ScatterPlot studyAccession={studyAccession} viewOptions={viewOptions} />
            </div>
          }
          { enabledTabs.includes('scatter') &&
            <div className={shownTab === 'scatter' ? '' : 'hidden'}>
              <div className="row">
                <div className="col-md-6">
                  <ScatterPlot studyAccession={studyAccession} viewOptions={viewOptions} />
                </div>
                <div className="col-md-6">
                  <ScatterPlot
                    studyAccession={studyAccession}
                    viewOptions={genelessViewOptions}
                    plotOptions= {{ showlegend: false }}/>
                </div>
              </div>
            </div>
          }
          { enabledTabs.includes('distribution') &&
            <div className={shownTab === 'distribution' ? '' : 'hidden'}>
              <StudyViolinPlot studyAccession={studyAccession} renderParams={viewOptions} genes={viewOptions.genes}/>
            </div>
          }
          { enabledTabs.includes('dotplot') &&
            <div className={shownTab === 'dotplot' ? '' : 'hidden'}>
              <DotPlotTab
                studyAccession={studyAccession}
                viewOptions={viewOptions}
                annotations={exploreInfo ? exploreInfo.annotationList.annotations : null}/>
            </div>
          }
        </div>
      </div>
    </>
  )
}

/** renders the dot plot tab for multi gene searches */
function DotPlotTab({ studyAccession, viewOptions, annotations }) {
  const annotationValues = getAnnotationValues(viewOptions.annotation, annotations)
  return (<StudyGeneDotPlot
    studyAccession={studyAccession}
    renderParams={viewOptions}
    genes={viewOptions.genes}
    annotationValues={annotationValues}
  />)
}
