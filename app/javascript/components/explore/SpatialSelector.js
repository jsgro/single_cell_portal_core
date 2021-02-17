import React from 'react'
import Select from 'react-select'

import { clusterSelectStyle } from 'components/visualization/ClusterControls'

/** takes the server response and returns cluster options suitable for react-select */
function getSpatialOptions(spatialGroupNames) {
  const clusterList = spatialGroupNames ? spatialGroupNames : []
  return clusterList.map(name => {return { label: name, value: name }})
}

/** component for displaying a spatial group selector */
export default function SpatialSelector({ dataParams, updateDataParams, spatialGroupNames }) {
  const options = getSpatialOptions(spatialGroupNames)
  return (
    <div className="form-group">
      <label>Spatial Groups</label>
      <Select options={options}
        value={dataParams.spatialGroups.map(name => ({ label: name, value: name }))}
        onChange={selectedOpts => updateDataParams({
          annotation: dataParams.annotation,
          cluster: dataParams.cluster,
          subsample: dataParams.value,
          consensus: dataParams.consensus,
          spatialGroups: selectedOpts.map(opt => opt.value)
        })}
        isMulti={true}
        styles={clusterSelectStyle}/>
    </div>
  )
}
