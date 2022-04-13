import React, { useEffect, useState } from 'react'
import _uniqueId from 'lodash/uniqueId'
import Plotly from 'plotly.js-dist'

import { fetchStudyUsage } from '~/lib/scp-api'
import LoadingSpinner from '~/lib/LoadingSpinner'
import { supportEmailLink } from '~/lib/error-utils'

/** display mixpanel stats for a given study */
export default function StudyUsageInfo({ study }) {
  const [usageInfo, setUsageInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewsGraphElementId] = useState(_uniqueId('study-usage-graph-'))
  const [downloadsGraphElementId] = useState(_uniqueId('study-usage-graph-'))
  const studyAccession = study.accession
  useEffect(() => {
    fetchStudyUsage(study._id.$oid).then(response => {
      setUsageInfo(response)
      setIsLoading(false)
    })
  }, [study.accession])

  const tableData = []

  if (usageInfo) {
    const viewData = usageInfo.pageViews.data
    const viewsTrace = {
      type: 'bar',
      x: viewData.series,
      y: viewData.series.map(x => {
        return viewData.values[x] ? viewData.values[x] : 0
      })
    }
    const viewsLayout = {
      xaxis: { title: 'Month' },
      yaxis: { title: 'Unique users' }
    }
    Plotly.react(viewsGraphElementId, [viewsTrace], viewsLayout)
    tableData.push(viewsTrace.x)
    tableData.push(viewsTrace.y)

    const downloadData = usageInfo.fileDownloads.data
    const downloadsTrace = {
      type: 'bar',
      x: downloadData.series,
      y: downloadData.series.map(x => {
        return downloadData.values[x] ? downloadData.values[x] : 0
      })
    }
    const downloadsLayout = {
      xaxis: { title: 'Month' },
      yaxis: { title: 'Download events' }
    }
    Plotly.react(downloadsGraphElementId, [downloadsTrace], downloadsLayout)
    tableData.push(downloadsTrace.y)
  }

  return <div>
    <h3>Study statistics</h3>
    {studyAccession}: <a href={`/single_cell/study/${studyAccession}`}>{ study.name }</a><br/>
    <div className="text-center">
      Users per month viewing this study.<br/>
      <LoadingSpinner isLoading={isLoading}/>
    </div>
    <div
      className="scatter-graph"
      id={viewsGraphElementId}
      data-testid={viewsGraphElementId}
    ></div>
    <br/><br/>
    <div className="text-center">
      File download events<br/>
      <LoadingSpinner isLoading={isLoading}/>
    </div>
    <div
      className="scatter-graph"
      id={downloadsGraphElementId}
      data-testid={viewsGraphElementId}
    ></div>
    <br/><br/>
    <div className="form-terra">
      { !isLoading && <table className="table-terra compressed">
        <thead>
          <tr>
            <td>Month</td>
            <td>Views</td>
            <td>Downloads</td>
          </tr>
        </thead>
        <tbody>
          { transpose(tableData).map((row, i) => (
            <tr key={i}>
              { row.map((d, i2) => <td key={i2}>{d}</td>) }
            </tr>
          ))}
        </tbody>
      </table> }
    </div> <br/>
    <div className="text-center">
      If you would like more information about views, downloads, or other statistics for your studies, contact us at { supportEmailLink }
    </div>
  </div>
}
/** transpose an array of arrays */
function transpose(matrix) {
  return matrix[0].map((col, i) => matrix.map(row => row[i]))
}
