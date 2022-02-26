import React, { useState } from 'react'
import ReactDOM from 'react-dom'

import Select from '~/lib/InstrumentedSelect'

/** updates the raw_counts_associations hidden field with the selections, which should be an array of id strings */
function updateHiddenField(hiddenField, selections) {
  if (hiddenField) {
    if (selections) {
      hiddenField.value = selections.map(selection => selection.value).join(' ')
    } else {
      hiddenField.value = ''
    }
  }
}

/** Renders a multiselect for mapping processed matrix to raw matrix files.
 *
 * @param {Object} initialValue current selected value
 * @param {Object} parentForm parent HTML form DOM object
 * @param {Object} hiddenField hidden HTML form field for tracking associations
 * @param {Array} opts select form options array
 * @param {Boolean} isRequired indicator that this association is a required field
 */
export default function RawAssociationSelect({
  initialValue, parentForm, hiddenField, opts, isRequired=false
}) {
  // selected is an array of string for the ids of the associated cluster files
  const [selected, setSelected] = useState(initialValue)

  /** handle change events from the multiselect component, and syncing the hidden field */
  function updateSelection(selections) {
    setSelected(selections)
    updateHiddenField(hiddenField, selections, parentForm)
  }

  const requiredLabel = isRequired ? <i className='text-danger'>*</i> : ''

  return (
    <label className="labeled-select">
      Associated raw count file {requiredLabel}
      <Select options={opts}
        value={selected}
        isMulti={true}
        placeholder="None"
        onChange={updateSelection}/>
    </label>
  )
}

/** convenience method for drawing/updating the component from non-react portions of SCP */
export function renderRawAssociationSelect(target, initialValue, hiddenField, opts, isRequired=false) {
  const parentForm = $(target).closest('.expression-file-info-fields')[0]
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <RawAssociationSelect
      initialValue={initialValue}
      parentForm={parentForm}
      hiddenField={hiddenField}
      opts={opts}
      isRequired={isRequired}/>,
    target
  )
}
