import React, {useState} from 'react'
import ReactDOM from 'react-dom'
import Select from 'react-select'

function getOtherNonSpatialForms(parentForm) {
  return $('form').not(`#${parentForm.id}`).has('input.is_spatial_false:checked')
}

function isInClusterForm(parentForm) {
  return $(parentForm).find('.is_spatial_false')[0].checked
}

function getDefaultSpatialAssociations(parentForm) {
  // default to the bottom non-spatial file
  let nearestClusterForm = getOtherNonSpatialForms(parentForm).last()
  if (nearestClusterForm) {
    return [{
      label: $(nearestClusterForm).find('.cluster-name').val(),
      value: $(nearestClusterForm).find('#study_file__id').val()
    }]
  }
  return []
}

function updateHiddenField(hiddenField, selections) {
  if (hiddenField) {
    if (selections) {
      hiddenField.value = selections.map(selection => selection.value).join(' ')
    } else {
      hiddenField.value = ''
    }
  }
}

export default function ClusterAssociationSelect({initialValue, parentForm, hiddenField, opts, isNew}) {
  if (isNew) {
    initialValue = getDefaultSpatialAssociations(parentForm)
    updateHiddenField(hiddenField, initialValue)
  }
  // selected is an array of string for the ids of the associated cluster files
  const [selected, setSelected] = useState(initialValue)

  if (isInClusterForm(parentForm)) {
    updateHiddenField(hiddenField, [])
    return <span className="hidden-cluster-select"></span>
  }

  function updateSelection(selections) {
    setSelected(selections)
    updateHiddenField(hiddenField, selections)
  }

  return (
    <label>
      Corresponding cluster:
      <Select options={opts}
              value={selected}
              isMulti={true}
              placeholder="None"
              onChange={updateSelection}/>
    </label>
  )
}

// convenience method for drawing/updating the component from non-react portions of SCP
export function renderClusterAssociationSelect(target, opts, initialValue, isNew, hiddenField) {
  const parentForm = $(target).closest('form')[0]
  ReactDOM.render(
    <ClusterAssociationSelect
      initialValue={initialValue}
      parentForm={parentForm}
      hiddenField={hiddenField}
      isNew={isNew}
      opts={opts}/>,
    target
  )
}
