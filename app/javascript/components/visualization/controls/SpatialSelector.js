import React from 'react'
import Select from 'react-select'

import { clusterSelectStyle } from 'lib/cluster-utils'

/** takes the server response and returns cluster options suitable for react-select */
function getSpatialOptions(spatialGroups) {
  const clusterList = spatialGroups ? spatialGroups : []
  return clusterList.map(group => {return { label: group.name, value: group.name }})
}

/** component for displaying a spatial group selector
  @param spatialGroups: an array of spatial clusters, each with a 'name' property.
  @param dataParams: an object specifying a spatialGroups property as an array of string names
  @param updateDataParams: update function for dataParams
*/
export default function SpatialSelector({ dataParams, updateDataParams, spatialGroups }) {
  const options = getSpatialOptions(spatialGroups)
  return (
    <div className="form-group">
      <label>Spatial Groups</label>
      <Select options={options}
        value={dataParams.spatialGroups.map(name => ({ label: name, value: name }))}
        onChange={selectedOpts => updateDataParams({
          spatialGroups: selectedOpts ? selectedOpts.map(opt => opt.value) : []
        })}
        isMulti={true}
        isClearable={false}
        styles={clusterSelectStyle}/>
    </div>
  )
}
