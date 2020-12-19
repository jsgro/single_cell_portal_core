/**
* @fileoverview User interface for "Create Annotations", or user annotations
*
* User annotations are created by signed-in users in the Explore tab of the
* Study Overview page.
*/

/* eslint-disable no-invalid-this */

import $ from 'jquery'
import Plotly from 'plotly.js-dist'

// array of arrays of cell names, aka selections, and of selection names
let selections = []
const namesArray = ['']

/** Get "Set label" text input HTML for each each annotation */
function getSetLabelInputs(rowIndex, selectionValue, textVal) {
  return (
    `<input type="text"
      name="user_annotation[user_data_arrays_attributes][${rowIndex}][name]"
      id="user_annotation_user_data_arrays_attributes_${rowIndex}_name"
      class="form-control annotation-label need-text"
      placeholder="Set label"
        value="${textVal}">` +
    `<input type="hidden"
      name="user_annotation[user_data_arrays_attributes][${rowIndex}][values]"
      id="user_annotation_user_data_arrays_attributes_${rowIndex}_values"
      value="${selectionValue}" />`
  )
}

/** Add rows to the table and update all the other rows */
function updateSelection() {
  // get all the names of rows to update
  const nameArray = []
  $('#well-table tbody tr').each(function() {
    nameArray.push(this.id)
    $(this).remove()
  })

  selections.forEach((selection, i) => {
    // for unselected row, when n == 0
    const name = (i === 0) ? 'Unselected' : `Selection ${i}`

    const id = `Selection${parseInt(i)}`

    // create delete button and listener, attach listener to update unselected
    const domClasses =
      'btn btn-sm btn-danger delete-btn annotation-delete-btn'
    const deleteButton = i === 0 ? '' :
      `${'<td class="col-sm-1" style="padding-top: 27px;">' +
        `<div class="${domClasses}" id="'${id}Button">` +
        `<span class="fas fa-times"></span>` +
        `</div>` +
        `</td>`}`

    const numCells = selection.length
    const row =
      `<tr>` +
      `<td id="${id}">${name}: ${numCells} cells${
        getSetLabelInputs(i, selection, namesArray[i])
      }</td>${
        deleteButton}`
    '</tr>'

    $('#well-table').prepend(row)
  })
  // attach listener to make sure all annotation labels are unique
  window.validateUnique('#create_annotations', '.annotation-label')
}

/**
 * Create selection creates the first row, unselected. only called at
 * creation of selection well
 */
function createSelection() {
  const selectionTable = $('#selection-table')
  selectionTable.empty()
  // add a well and table to div
  selectionTable.prepend(
    '<div class="col-sm-12">' +
        '<table id="well-table" class="table table-condensed">' +
          '<tbody></tbody>' +
        '</table>' +
      '</div>')

  // add the first row, unselected
  selections.forEach((selection, i) => {
    const name = (i === 0) ? 'Unselected' : `Selection ${i}`
    const row =
      `${'<tr>' +
      '<td id="'}${name}">${name}: ${selection.length} cells${
        getSetLabelInputs(i, selection, '')
      }</td>` +
      `</tr>`

    $('#well-table').prepend(row)
  })
}

/** Attach event listeners for user annotations component */
function attachEventListeners(target) {
  // Listen for selections in the target scatter plot
  target.on('plotly_selected', eventData => {
    const selection =[]

    console.log(eventData)

    // get selected cells curve number and point number
    // plotly only gives x and y values per point, so we have to use point id
    // to get annotation and cell name
    eventData.points.forEach(pt => {
      selection.push(target.data[pt.curveNumber].cells[pt.pointNumber])
    })

    // update previous selections, to ensure they have no duplicate cell names
    selections = selections.map(thisSelection => {
      return window._.difference(thisSelection, selection)
    })
    // add this selection to all the others
    selections.push(selection)
    // add a blank name to array of names
    namesArray.push('')
    // remove all empty arrays from selections, and their names
    selections.forEach((selection, i) => {
      if (selection.length === 0) {
        selections.splice(i, 1)
        namesArray.splice(i, 1)
      }
    })
    // after selection, update rows
    updateSelection(selections, namesArray)
  })

  // Listen for text entry and remember it
  $('#selection-well').on('change paste keyup', '.annotation-label',
    function() {
      const trimmedId = this.id
        .replace('user_annotation_user_data_arrays_attributes_', '')
        .replace('_name', '')
      const index = parseInt(trimmedId)
      namesArray[index] = $(this).val()
    }
  )

  // Update selections upon clicking selection wells
  $('#selection-well').on('click', '.annotation-delete-btn', function() {
    const trimmedId = this.id.replace('Selection', '').replace('Button', '')
    const index = parseInt(trimmedId)
    selections[0] = selections[0].concat(selections[index])
    selections.splice(index, 1)
    updateSelection(selections, namesArray)
  })
}

/** Initialize "Create Annotations" functionality for user annotations */
export default function userAnnotations() {
  // TODO (SCP-2962): Support "Create Annotations" for spatial scatter plots
  const targetPlotId = 'scatter-plot-0'

  const target = document.getElementById(targetPlotId)

  // show the selection well and submit button
  $('#selection-well, #selection-button').css('visibility', 'visible')

  // Set the initial unselected array
  let unselectedCells = []

  // set initial unselected
  target.data.map(trace => unselectedCells.push(trace.cells))

  unselectedCells = unselectedCells.flat()
  // flatten array
  selections = [unselectedCells]

  target.layout.dragmode = 'lasso'
  target.layout.scene = { unselectBatch: unselectedCells }

  // change to lasso mode
  Plotly.relayout(targetPlotId, target.layout)

  attachEventListeners(target)

  createSelection()
}
