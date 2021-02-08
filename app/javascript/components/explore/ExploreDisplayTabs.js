import React, { useEffect, useRef } from 'react'
import _clone from 'lodash/clone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faReply } from '@fortawesome/free-solid-svg-icons'

import StudyGeneField from './StudyGeneField'
import ScatterPlot from 'components/visualization/ScatterPlot'
import StudyViolinPlot from 'components/visualization/StudyViolinPlot'
import DotPlot from 'components/visualization/DotPlot'
import Heatmap from 'components/visualization/Heatmap'
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
 * as their display doesn't make sense with the current dataParams, and so they will
 * need to re-render on dataParams change anyway
 *
 * @param {String} studyAccession  the study accession to visualize
 * @param {Object} exploreInfo  the object returned from a call to api/v1/studies/{study}/visualization/explore
 * @param {Object} dataParams  object with cluster, annotation, and other viewing properties specified.
 * @param { Function } updateDataParams function for passing updates to the dataParams object
 */
export default function ExploreDisplayTabs(
  { studyAccession, exploreInfo, renderParams, dataParams, updateDataParams }
) {
  const isMultiGene = dataParams.genes.length > 1
  const isGene = dataParams.genes.length > 0
  const firstRender = useRef(true)
  const tabContainerEl = useRef(null)
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

  let shownTab = dataParams.tab
  if (!enabledTabs.includes(shownTab)) {
    shownTab = enabledTabs[0]
  }
  // dataParams object without genes specified, to pass to cluster comparison graphs
  const genelessDataParams = _clone(dataParams)
  genelessDataParams.genes = []

  /** helper function so that StudyGeneField doesn't have to see the full dataParams object */
  function setGenes(genes) {
    updateDataParams({ genes })
  }
  /** helper function to get render width avaiable for chart components, since they may be first rendered hidden */
  function getTabWidth() {
    return tabContainerEl.clientWidth - 30 // 30 is the bootstrap auto-padding
  }
  useEffect(() => {
    if (!firstRender.current) {
      // switch back to the default tab for a given view when the genes/consensus changes
      updateDataParams({ tab: enabledTabs[0] })
    } else {
      firstRender.current = false
    }
  }, [dataParams.genes.join(','), dataParams.consensus])
  return (
    <>
      <div className="row">
        <div className="col-md-5">
          <div className="flexbox">
            <StudyGeneField genes={dataParams.genes}
              setGenes={setGenes}
              allGenes={exploreInfo ? exploreInfo.uniqueGenes : []}/>
            {isGene && <button className="action fa-lg"
              onClick={() => setGenes([])}
              title="return to cluster view"
              data-analytics-name="back-to-cluster-view">
              <FontAwesomeIcon icon={faReply}/>
            </button> }
          </div>
        </div>
        <div className="col-md-7">
          <ul className="nav nav-tabs" role="tablist" data-analytics-name="explore-default">
            { enabledTabs.map(tabKey => {
              const label = tabList.find(({ key }) => key === tabKey).label
              return (
                <li key={tabKey} role="presentation" className={`study-nav ${tabKey === shownTab ? 'active' : ''}`}>
                  <a onClick={() => updateDataParams({ tab: tabKey })}>{label}</a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12 explore-plot-tab-content" ref={tabContainerEl}>
          { enabledTabs.includes('cluster') &&
            <div className={shownTab === 'cluster' ? '' : 'hidden'}>
              <ScatterPlot studyAccession={studyAccession} dataParams={dataParams} />
            </div>
          }
          { enabledTabs.includes('scatter') &&
            <div className={shownTab === 'scatter' ? '' : 'hidden'}>
              <div className="row">
                <div className="col-md-6">
                  <ScatterPlot
                    studyAccession={studyAccession}
                    dataParams={dataParams}
                    renderParams={renderParams}/>
                </div>
                <div className="col-md-6">
                  <ScatterPlot
                    studyAccession={studyAccession}
                    dataParams={genelessDataParams}
                    renderParams={renderParams}
                    plotOptions= {{ showlegend: false }}/>
                </div>
              </div>
            </div>
          }
          { enabledTabs.includes('distribution') &&
            <div className={shownTab === 'distribution' ? '' : 'hidden'}>
              <StudyViolinPlot studyAccession={studyAccession} dataParams={dataParams} genes={dataParams.genes}/>
            </div>
          }
          { enabledTabs.includes('dotplot') &&
            <div className={shownTab === 'dotplot' ? '' : 'hidden'}>
              <DotPlotTab
                studyAccession={studyAccession}
                dataParams={dataParams}
                annotations={exploreInfo ? exploreInfo.annotationList.annotations : null}
                widthFunc={getTabWidth}/>
            </div>
          }
          { enabledTabs.includes('heatmap') &&
            <div className={shownTab === 'heatmap' ? '' : 'hidden'}>
              <Heatmap studyAccession={studyAccession} dataParams={dataParams} genes={dataParams.genes} widthFunc={getTabWidth}/>
            </div>
          }
        </div>
      </div>
    </>
  )
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
