import React, { useState, useContext, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import Select from 'react-select'

import DotPlot from './DotPlot'
import { fetchAnnotations, getAnnotationCellValuesURL, getExpressionHeatmapURL } from 'lib/scp-api'
import { UserContext } from 'providers/UserProvider'
import _uniq from 'lodash/uniq'

/** Renders a dotplot and associated cluster/annotation selection controls */
export default function StudyGeneDotPlot({ study, genes }) {
  const userState = useContext(UserContext)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [annotationList, setAnnotationList] =
    useState({default_cluster: null, default_annotation: null, annotations: []})
  const [renderParams, setRenderParams] = useState({
    userUpdated: false,
    cluster: '',
    annotation: ''
  })

  const annotationOptions = [
    {
      label: 'Study Wide',
      options: annotationList.annotations
                              .filter(annot => annot.scope == 'study')
    }, {
      label: 'Cluster-Based',
      options: annotationList.annotations
                             .filter(annot => annot.cluster_name == renderParams.cluster)
    }
  ]
  const clusterOptions = _uniq(annotationList.annotations
                                             .map((annot) => annot.cluster_name)
                                             .filter(name => !!name))

  /** fetch the expression data from the server */
  async function loadData(paramsToRender) {
    setIsLoading(true)
    if (!clusterOptions.length) {
      const annotationData = await fetchAnnotations(study.accession)

      setAnnotationList(annotationData)

      paramsToRender = {
        userUpdated: false,
        cluster: annotationData.default_cluster,
        annotation: annotationData.default_annotation
      }
      setRenderParams(paramsToRender)
    }

    setIsLoaded(true)
    setIsLoading(false)
  }
  useEffect(() => {
    if (!isLoading && !isLoaded || renderParams.userUpdated) {
      loadData(renderParams)
    }
  }, [renderParams.cluster, renderParams.annotation.name, renderParams.annotation.scope])

  return (
    <div className="row graph-container">
      <div className="col-md-9">
        { isLoaded && !isLoading &&
          <DotPlot expressionValuesURL={getExpressionHeatmapURL(study.accession, genes)}
                   annotationCellValuesURL={
                     getAnnotationCellValuesURL(study.accession,
                                 renderParams.cluster,
                                 renderParams.annotation.name,
                                 renderParams.annotation.scope,
                                 renderParams.annotation.type)

                   }
                   annotation={renderParams.annotation}/>
        }
        { isLoading && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
      </div>
      <div className="col-md-3 graph-controls">
        <div className="form-group">
          <label>Load cluster</label>
          <Select
            value={ {label: renderParams.cluster, value: renderParams.cluster} }
            options={ clusterOptions.map(name => {return { label: name, value: name}}) }
            onChange={ cluster => setRenderParams({
              userUpdated: true,
              annotation: annotationList.annotations
                                        .filter(annot => annot.cluster_name == cluster.value)[0],
              cluster: cluster.value
            })}
          />
        </div>
        <div className="form-group">
          <label>Select annotation</label>
          <Select
            value={ renderParams.annotation }
            options={ annotationOptions }
            getOptionLabel={ annotation => annotation.name}
            getOptionValue={ annotation => annotation.scope + annotation.name + annotation.cluster_name }
            onChange={ annotation => setRenderParams({
              userUpdated: true,
              annotation: annotation,
              cluster: renderParams.cluster
            })}/>
        </div>
      </div>
    </div>
  )
}
