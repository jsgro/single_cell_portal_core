import React, { useState, useContext, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'

import { fetchCluster, getAnnotationValuesURL, getExpressionHeatmapURL } from 'lib/scp-api'
import { UserContext } from 'providers/UserProvider'

/** This does NOT yet fully work!  It renders something dotplot like, but isn't handling annotations
  * properly yet */
export default function StudyGeneDotPlot({ study, genes }) {
  const userState = useContext(UserContext)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  /** fetch the expression data from the server */
  async function loadData() {
    setIsLoading(true)
    const annotations = await fetchCluster(study.accession, , , , , true)

    window.renderMorpheusDotPlot(
      getExpressionHeatmapURL(study.accession, genes),
      getAnnotationValuesURL(study.accession),
      'CLUSTER',
      'group',
      `#expGraph${study.accession}`,
      annotations,
      '',
      450,
      `#expGraph${study.accession}-legend`
    )
    setIsLoaded(true)
    setIsLoading(false)

  }
  useEffect(() => {
    if (!isLoading && !isLoaded) {
      loadData()
    }
  })
  return (
    <div className="row">
      <div className="col-md-12">
        <div className="expression-graph" id={`expGraph${study.accession}`}></div>
        { isLoading && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
      </div>
    </div>
  )
}
