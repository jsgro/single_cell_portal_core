import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import Select from 'react-select'

/** whether or not the given form specifies a raw counts expression form */
function isInRawForm(parentForm) {
  return $(parentForm).find('.is_raw_counts_true')[0].checked
}

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

/** Renders a multiselect for mapping processed matrix to raw matrix files.  Meant to be embedded in
 the rails _initialize_expression_form */
export default function RawAssociationSelect({ initialValue, parentForm, hiddenField, opts }) {
  // selected is an array of string for the ids of the associated cluster files
  const [selected, setSelected] = useState(initialValue)

  if (isInRawForm(parentForm)) {
    updateHiddenField(hiddenField, [])
    return <span className="hidden-raw-association-select"></span>
  }

  /** handle change events from the multiselect component, and syncing the hidden field */
  function updateSelection(selections) {
    setSelected(selections)
    updateHiddenField(hiddenField, selections, parentForm)
  }

  // set minWidth to 100% on label to allow select to expand to fill entire column
  return (
    <label style={{ minWidth: '100%' }}>
      Corresponding raw file:
      <Select options={opts}
              value={selected}
              isMulti={true}
              placeholder="None"
              onChange={updateSelection}/>
    </label>
  )
}

/** convenience method for drawing/updating the component from non-react portions of SCP */
export function renderRawAssociationSelect(target, opts, initialValue, hiddenField) {
  const parentForm = $(target).closest('.expression-file-info-fields')[0]
  ReactDOM.render(
    <RawAssociationSelect
      initialValue={initialValue}
      parentForm={parentForm}
      hiddenField={hiddenField}
      opts={opts}/>,
    target
  )
}
