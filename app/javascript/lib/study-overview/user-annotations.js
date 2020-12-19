/**
* @fileoverview User interface for "Create Annotations", or user annotations
*
* User annotations are created by signed-in users in the Explore tab of the
* Study Overview page.
*/

/* eslint-disable no-invalid-this */

import $ from 'jquery'
import Plotly from 'plotly.js-dist'

// Array of arrays of cell names, aka selections, and of selection names
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

/** Get main part of a selection row well */
function getSelectionTd(rowIndex, selections, id) {
  const name = (rowIndex === 0) ? 'Unselected' : `Selection ${rowIndex}`
  const selection = selections[rowIndex]

  const numCells = selection.length
  return `<td id="${id}">${name}: ${numCells} cells${
    getSetLabelInputs(rowIndex, selection, namesArray[rowIndex])
  }</td>`
}

/** Add rows to the table and update all the other rows */
function updateSelection() {
  // Get all the names of rows to update
  const nameArray = []
  $('#well-table tbody tr').each(function() {
    nameArray.push(this.id)
    $(this).remove()
  })

  selections.forEach((selection, i) => {
    // For unselected row, when n == 0
    const id = `Selection${parseInt(i)}`

    // Create delete button and listener, attach listener to update unselected
    const domClasses =
      'btn btn-sm btn-danger delete-btn annotation-delete-btn'
    const deleteButton = i === 0 ? '' :
      `${'<td class="col-sm-1" style="padding-top: 27px;">' +
        `<div class="${domClasses}" id="'${id}Button">` +
        `<span class="fas fa-times"></span>` +
        `</div>` +
        `</td>`}`

    const selectionTd = getSelectionTd(i, selections, id)
    const row = `<tr>${selectionTd}${deleteButton}</tr>`

    $('#well-table').prepend(row)
  })
  // Attach listener to make sure all annotation labels are unique
  window.validateUnique('#create_annotations', '.annotation-label')
}

/**
 * Create the first row, "Unselected: {#} cells". Only called once.
 */
function createSelection() {
  const selectionTable = $('#selection-table')

  // Initialize content to a well table
  selectionTable.html(
    '<div class="col-sm-12">' +
        '<table id="well-table" class="table table-condensed">' +
          '<tbody></tbody>' +
        '</table>' +
      '</div>')

  // Add the first row, i.e. "Unselected: {#} cells"
  const selectionTd = getSelectionTd(0, selections, '')
  const row = `<tr>${selectionTd}</tr>`

  $('#well-table').prepend(row)
}

/** Attach event listeners for user annotations component */
function attachEventListeners(target) {
  // Listen for selections in the target scatter plot
  target.on('plotly_selected', eventData => {
    const selection = []

    console.log(eventData)

    // Get selected cells curve number and point number
    // plotly only gives x and y values per point, so we have to use point id
    // to get annotation and cell name
    eventData.points.forEach(pt => {
      selection.push(target.data[pt.curveNumber].cells[pt.pointNumber])
    })

    // Update previous selections, to ensure they have no duplicate cell names
    selections = selections.map(thisSelection => {
      return window._.difference(thisSelection, selection)
    })
    // Add this selection to all the others
    selections.push(selection)
    // Add a blank name to array of names
    namesArray.push('')
    // Remove all empty arrays from selections, and their names
    selections.forEach((selection, i) => {
      if (selection.length === 0) {
        selections.splice(i, 1)
        namesArray.splice(i, 1)
      }
    })
    // After selection, update rows
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
  $('#selection-well, #selection-button').css('visibility', 'visible')

  // TODO (SCP-2962): Support "Create Annotations" for spatial scatter plots
  const targetPlotId = 'scatter-plot-0'

  const target = document.getElementById(targetPlotId)

  let unselectedCells = target.data.map(trace => trace.cells)

  unselectedCells = unselectedCells.flat()
  selections = [unselectedCells]

  target.layout.dragmode = 'lasso'
  target.layout.scene = { unselectBatch: unselectedCells }

  // Change scatter plot to use lasso mode, for free-hand cell selection
  Plotly.relayout(targetPlotId, target.layout)

  attachEventListeners(target)

  createSelection()
}
