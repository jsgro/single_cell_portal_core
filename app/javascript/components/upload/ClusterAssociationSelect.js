import React, { useState } from 'react'
import ReactDOM from 'react-dom'

import Select from 'lib/InstrumentedSelect'

/** find the forms on the page that are not the form this component is rendered in, and non-spatial */
// function getOtherNonSpatialForms(parentForm) {
//   return $('form').not(`#${parentForm.id}`).has('input.is_spatial_false:checked')
// }

/** whether or not the given form specifies a non-spatial cluster form */
function isInClusterForm(parentForm) {
  return $(parentForm).find('.is_spatial_false')[0].checked
}

/** get the nearest non-spatial cluster form above the current form, and return the name&id */
// function getDefaultSpatialAssociations(parentForm) {
//   // default to the bottom non-spatial file
//   let nearestClusterForm = getOtherNonSpatialForms(parentForm).last()
//   if (nearestClusterForm) {
//     return [{
//       label: $(nearestClusterForm).find('.cluster-name').val(),
//       value: $(nearestClusterForm).find('#study_file__id').val()
//     }]
//   }
//   return []
// }

/** updates the cluster-spatial hidden field with the selections, which should be an array of id strings */
function updateHiddenField(hiddenField, selections) {
  if (hiddenField) {
    if (selections) {
      hiddenField.value = selections.map(selection => selection.value).join(' ')
    } else {
      hiddenField.value = ''
    }
  }
}

/** Renders a multiselect for tying clusters to spatial files.  Meant to be embedded in
 the rails _initialize_ordinations form */
export default function ClusterAssociationSelect({ initialValue, parentForm, hiddenField, opts, isNew }) {
  if (isNew) {
    // we don't set the default value currently due to feedback that this might make
    // it too easy for erroneous connections to be made.
    // the code is left here since that decision is not final yet.
    // initialValue = getDefaultSpatialAssociations(parentForm)
    updateHiddenField(hiddenField, initialValue)
  }
  // selected is an array of string for the ids of the associated cluster files
  const [selected, setSelected] = useState(initialValue)

  if (isInClusterForm(parentForm)) {
    updateHiddenField(hiddenField, [])
    return <span className="hidden-cluster-select"></span>
  }

  /** handle change events from the multiselect component, and syncing the hidden field */
  function updateSelection(selections) {
    setSelected(selections)
    updateHiddenField(hiddenField, selections)
  }
  return (
    <label className="labeled-select">
      Corresponding cluster:
      <Select options={opts}
        data-analytics-name="cluster-association-select"
        value={selected}
        isMulti={true}
        placeholder="None"
        onChange={updateSelection}/>
    </label>
  )
}

/** convenience method for drawing/updating the component from non-react portions of SCP */
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
