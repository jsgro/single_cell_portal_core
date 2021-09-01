import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import Select from 'react-select'

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
 */
export default function RawAssociationSelect({ initialValue, parentForm, hiddenField, opts }) {
  // selected is an array of string for the ids of the associated cluster files
  const [selected, setSelected] = useState(initialValue)

  /** handle change events from the multiselect component, and syncing the hidden field */
  function updateSelection(selections) {
    setSelected(selections)
    updateHiddenField(hiddenField, selections, parentForm)
  }

  // set minWidth to 100% on label to allow select to expand to fill entire column
  return (
    <label className="min-width-100">
      Associated raw count file <i className='text-danger'>*</i>
      <Select options={opts}
              value={selected}
              isMulti={true}
              placeholder="None"
              onChange={updateSelection}/>
    </label>
  )
}

/** convenience method for drawing/updating the component from non-react portions of SCP */
export function renderRawAssociationSelect(target, initialValue, hiddenField, opts) {
  const parentForm = $(target).closest('.expression-file-info-fields')[0]
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <RawAssociationSelect
      initialValue={initialValue}
      parentForm={parentForm}
      hiddenField={hiddenField}
      opts={opts}/>,
    target
  )
}
