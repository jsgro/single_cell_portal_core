/* eslint-disable no-invalid-this */

import $ from 'jquery'
import Plotly from 'plotly.js-dist'

/** Initialize "Create Annotations" */
export default function userAnnotations() {
  // TODO (SCP-2962): Support "Create Annotations" for spatial scatter plots
  const targetPlotId = 'scatter-plot-0'

  const target = document.getElementById(targetPlotId)

  const selectionWell = $('#selection-well')
  const selectionTable = $('#selection-table')
  const selectionButton = $('#selection-button')

  // array of arrays of cell names, aka selections, and of selection names
  const selections = []
  const namesArray = ['']

  // show the selection well and submit button
  selectionWell.css('visibility', 'visible')
  selectionButton.css('visibility', 'visible')

  // Set the initial unselected array
  let unselectedCellArray = []

  // set initial unselected
  for (let m = 0; m < target.data.length; m++) {
    unselectedCellArray.push(target.data[m].cells)
  }

  // flatten array
  unselectedCellArray = [].concat.apply([], unselectedCellArray)

  const unselected = unselectedCellArray
  selections.push(unselected)

  target.layout.dragmode = 'lasso'
  target.layout.scene.unselectBatch = unselected

  // change to lasso mode
  Plotly.relayout(targetPlotId, target.layout)

  /** Get "Set label" text input HTML for each each annotation */
  function getSetLabelInputs(rowIndex, selectionValue, textVal) {
    return (
      `<input
        type="text"
        name="user_annotation[user_data_arrays_attributes][${rowIndex}][name]"
        id="user_annotation_user_data_arrays_attributes_${rowIndex}_name"
        class="form-control annotation-label need-text"
        placeholder="Set Label"
        value="${textVal}">` +
      `<input
        name="user_annotation[user_data_arrays_attributes][${rowIndex}][values]"
        id="user_annotation_user_data_arrays_attributes_${rowIndex}_values"
        type="hidden"
        value="${selectionValue}" />`
    )
  }

  /**
   * Create selection creates the first row, unselected. only called at
   * creation of selection well
   */
  function createSelection() {
    console.log('createSelection')
    // make sure table is empty
    selectionTable.empty()
    // add a well and table to div
    selectionTable.prepend(
      '<div class="col-sm-12">' +
        '<table id="well-table" class="table table-condensed">' +
          '<tbody></tbody>' +
        '</table>' +
      '</div>')

    // add the first row, unselected
    for (let m = 0; m < selections.length; m++) {
      let name = `Selection ${m}`
      if (m === 0) {
        name = 'Unselected'
      }
      const addS =
              `${'<tr>' +
              '<td id="'}${name}">${name}: ${selections[m].length} Cells${
                getSetLabelInputs(m, selections[m], '')
              }</td>` +
              `</tr>`

      $('#well-table').prepend(addS)
    }
  }

  /** add rows to the table and update all the other rows */
  function updateSelection() {
    let name
    // get all the names of rows to update
    const nameArray = []
    $('#well-table tbody tr').each(function() {
      nameArray.push(this.id)
      $(this).remove()
    })

    // iterate through the rows to update them
    for (let n = 0; n < selections.length; n++) {
      // for unselected row, when n == 0
      if (n === 0) {
        name = 'Unselected'
      } else {
        name = `Selection ${parseInt(n)}`
      }
      const id = `Selection${parseInt(n)}`

      // create delete button and listener, attach listener to update unselected
      const domClasses =
        'btn btn-sm btn-danger delete-btn annotation-delete-btn'
      const deleteButton = n === 0 ? '' :
        `${'<td class="col-sm-1" style="padding-top: 27px;">' +
              `<div class="${domClasses}" id="'${id}Button">` +
              `<span class="fas fa-times"></span>` +
              `</div>` +
              `</td>`}`

      const numCells = selections[n].length
      // rowString is the string to add, that contains all the row information
      const rowString =
              `<tr id="${id}Row">` +
              `<td id="${id}">${
                name}: ${numCells} Cells${
                getSetLabelInputs(n, selections[n], namesArray[n])
              }</td>${
                deleteButton}`
      '</tr>'

      $('#well-table').prepend(rowString)
    }
    // attach listener to make sure all annotation labels are unique
    window.validateUnique('#create_annotations', '.annotation-label')
  }

  // attach selection listener
  target.on('plotly_selected', eventData => {
    const selection =[]

    console.log(eventData)

    // get selected cells curve number and point number
    // plotly only giver x and y values per point, so we have to use point id
    // to get annotation and cell name
    eventData.points.forEach(pt => {
      selection.push(target.data[pt.curveNumber].cells[pt.pointNumber])
    })

    // update previous selections, to ensure they have no duplicate cell names
    for (let t = 0; t < selections.length; t++) {
      selections[t] = window._.difference(selections[t], selection)
    }
    // add this selection to all the others
    selections.push(selection)
    // add a blank name to array of names
    namesArray.push('')
    // remove all empty arrays from selections, and their names
    for (let i = 0; i < selections.length; i++) {
      if (selections[i].length <1) {
        selections.splice(i, 1)
        namesArray.splice(i, 1)
      }
    }
    // after selection, update rows
    updateSelection()
  })


  // Event listener to remember typing names in
  $('#selection-well').on('change paste keyup', '.annotation-label',
    function() {
      const trimmedId = this.id
        .replace('user_annotation_user_data_arrays_attributes_', '')
        .replace('_name', '')
      const index = parseInt(trimmedId)
      namesArray[index] = $(this).val()
    }
  )

  // Event listener to handle deleting selected annotations
  $('#selection-well').on('click', '.annotation-delete-btn', function() {
    const trimmedId = this.id.replace('Selection', '').replace('Button', '')
    const index = parseInt(trimmedId)
    console.log(index)
    selections[0] = selections[0].concat(selections[index])
    selections.splice(index, 1)
    updateSelection()
  })

  createSelection()
}
