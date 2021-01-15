/**
* @fileoverview UI for "Create Annotation" -- creating a user annotation
*
* User annotations are created by signed-in users in the Explore tab of the
* Study Overview page.
*
* Walk-through:
* https://github.com/broadinstitute/single_cell_portal/wiki/Annotations
*/

/* eslint-disable no-invalid-this */

import $ from 'jquery'
import Plotly from 'plotly.js-dist'

import { log } from 'lib/metrics-api'

// Array of arrays of cell names, a.k.a. selections, and of selection labels
let selections = []
const labels = ['']

/** Get "Set annotation label" text input HTML for each selection */
function getAnnotationLabelInputs(rowIndex, selectionValue, label) {
  return (
    `<input type="text"
      name="user_annotation[user_data_arrays_attributes][${rowIndex}][name]"
      id="user_annotation_user_data_arrays_attributes_${rowIndex}_name"
      class="form-control annotation-label need-text"
      placeholder="Set annotation label"
      value="${label}">` +
    `<input type="hidden"
      name="user_annotation[user_data_arrays_attributes][${rowIndex}][values]"
      id="user_annotation_user_data_arrays_attributes_${rowIndex}_values"
      value="${selectionValue}" />`
  )
}

/** Get delete button for the row at the given index */
function getDeleteButton(rowIndex, id) {
  const domClasses = 'btn btn-sm btn-danger delete-btn annotation-delete-btn'
  let deleteButton = ''
  if (rowIndex > 0) {
    deleteButton = `${'<td class="col-sm-1" style="padding-top: 27px;">' +
    `<div class="${domClasses}" id="${id}Button">` +
    `<span class="fas fa-times"></span>` +
    `</div>` +
    `</td>`}`
  }
  return deleteButton
}

/** Get text input for annotation label */
function getSelectionRow(rowIndex, selections, id) {
  const name = (rowIndex === 0) ? 'Unselected' : `Selection ${rowIndex}`
  const selection = selections[rowIndex]

  const numCells = selection.length
  const selectionTd = `<td id="${id}">${name}: ${numCells} cells${
    getAnnotationLabelInputs(rowIndex, selection, labels[rowIndex])
  }</td>`

  const deleteButton = getDeleteButton(rowIndex, id)

  return `<tr>${selectionTd}${deleteButton}</tr>`
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
    const row = getSelectionRow(i, selections, id)
    $('#well-table').prepend(row)
  })

  // Attach listener to make sure all annotation labels are unique
  window.validateUnique('#create_annotations', '.annotation-label')
}

/**
 * Create selection table and "Unselected" row. Only called once.
 */
function createSelectionTable() {
  const selectionTable = $('#selection-table')

  // Initialize content to a well table
  selectionTable.html(
    '<div class="col-sm-12">' +
        '<table id="well-table" class="table table-condensed">' +
          '<tbody></tbody>' +
        '</table>' +
      '</div>')

  // Add the first row, i.e. "Unselected: {#} cells"
  const row = getSelectionRow(0, selections, '')

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
    labels.push('')
    // Remove all empty arrays from selections, and their names
    selections.forEach((selection, i) => {
      if (selection.length === 0) {
        selections.splice(i, 1)
        labels.splice(i, 1)
      }
    })
    // After selection, update rows
    updateSelection(selections, labels)
  })

  // Listen for text entry and remember it
  $('#selection-well').on('change paste keyup', '.annotation-label',
    function() {
      const trimmedId = this.id
        .replace('user_annotation_user_data_arrays_attributes_', '')
        .replace('_name', '')
      const index = parseInt(trimmedId)
      labels[index] = $(this).val()
    }
  )

  // Update selections upon clicking selection wells
  $('#selection-well').on('click', '.annotation-delete-btn', function() {
    const trimmedId = this.id.replace('Selection', '').replace('Button', '')
    const index = parseInt(trimmedId)
    selections[0] = selections[0].concat(selections[index])
    selections.splice(index, 1)
    updateSelection(selections, labels)
  })

  $(document).on('click', '#selection-submit', () => {
    console.log('in click handler for #selection-submit')
    const currentName = $('#user_annotation_name').val()
    const needText = $('.need-text')
    const numFields = needText.toArray().length
    const values = []
    let cont = true
    for (let i = 0; i < numFields; i++) {
      const text = needText.eq(i).val()
      values.push(text)
      if (text === '') {cont = false}
    }

    if (numFields < 3) {
      alert('Your annotation must have at least two populations')
    } else if (!cont) {
      alert('You must provide a value for all labels before saving')
      setErrorOnBlank(needText)
    } else if (values.includes('Undefined')) {
      alert('Undefined is a reserved term. Select a different name for this label.')
      setErrorOnBlank(needText)
    } else {
      console.log('in "Saving... Please Wait"')
      $('#generic-modal-title').html('Saving... Please Wait')
      ga('send', 'event', 'engaged_user_action', 'create_custom_cell_annotation')
      log('create-custom-cell-annotation')
      launchModalSpinner('#generic-modal-spinner', '#generic-modal', () => {
        console.log('**** in user-annotation form submit')
        const form = $('#create_annotations')
        console.log('form')
        console.log(form)
        form.submit()
        $.ajax({
          url: window.SCP.createUserAnnotationsPath,
          method: 'POST'

        })
        // Endpoint format: /single_cell/study/<accession>/<study_name>/create_user_annotations
        // Method: POST
        // annotation_name: value of #annotation-name text input field
        // user_id: current_user.id
        // cluster_group_id: @cluster.id
        // study_id: @study.id
        // loaded_annotation: params[:annotation]
        // if !params[:subsample].blank? %>
        //    subsample_annotation: params[:annotation]
        //    subsample_threshold: params[:subsample]
      })
    }
  })
}

/**
* Close the user annotations panel if open when rendering clusters
*/
export function closeUserAnnotationsForm() {
  if ($('#selection_div').attr('class') === '') {
    console.log('closing user annotations form')
    // menu is open, so empty forms and reset button state
    $('#selection_div').html('')
    $('#selection_div').toggleClass('collapse')
    $('#toggle-scatter').children().toggleClass('fa-toggle-on fa-toggle-off')
  }
}

function writeFormHtml() {
  // Example form action:
  // https://localhost:3000/single_cell/study/SCP70/male-mouse-brain/create_user_annotations
  // Endpoint format: /single_cell/study/<accession>/<study_name>/create_user_annotations
  // Method: POST
  // annotation_name: value of #annotation-name text input field
  // user_id: current_user.id
  // cluster_group_id: @cluster.id
  // study_id: @study.id
  // loaded_annotation: params[:annotation]
  // if !params[:subsample].blank? %>
  //    subsample_annotation: params[:annotation]
  //    subsample_threshold: params[:subsample]
  const formHtml = `
    <div class="row no-bottom-margin form-group" id="selection-well">
      <div class="col-sm-12 form-group">
        <input type="text"
          id="annotation-name" class="form-control need-text annotation-name"
          placeholder="Name this group of labels" />
      </div>
      <div id="selection-table"></div>
      <div id="selection-button">
        <div class="col-xs-12 text-center">
          <button id="selection-submit" class="btn btn-success">Create Annotation</button>
        </div>
      </div>
    </div>`

  $('#selection_div').html(formHtml)
}

/** Initialize "Create Annotation" functionality for user annotations */
export default function userAnnotations() {
  writeFormHtml()

  $('#selection-well, #selection-button').css('visibility', 'visible')

  // TODO (SCP-2962): Support "Create Annotation" for spatial scatter plots
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

  createSelectionTable()
}
