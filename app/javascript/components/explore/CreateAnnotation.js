import React, { useState } from 'react'
import Panel from 'react-bootstrap/lib/Panel'
import Switch from 'react-switch'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faMinus, faTimes } from '@fortawesome/free-solid-svg-icons'
import _difference from 'lodash/difference'

import { useUpdateEffect } from 'hooks/useUpdate'
import { isUserLoggedIn } from 'providers/UserProvider'

/** takes in an element with a plotly graph and returns an array of selected cell names */
function getSelectedCells(plotlyTarget) {
  const selectedPoints = []
  plotlyTarget.data.forEach(trace => {
    if (trace.selectedpoints) {
      const selections = trace.selectedpoints.map(pointIndex => {
        return trace.cells[pointIndex]
      })
      // push/apply has better performance than concat, apparently
      // https://codeburst.io/jsnoob-push-vs-concat-basics-and-performance-comparison-7a4b55242fa9
      Array.prototype.push.apply(selectedPoints, selections)
    }
  })
  return selectedPoints
}

/** derives an 'unselected' annotation label from the remainder of points */
function computeRemainderLabel(selectedAnnotations, allTraces) {
  const selectedCount = selectedAnnotations.map(annot => annot.cells.length).reduce((a, b) => a + b, 0)
  const totalCount = allTraces.map(trace => trace.cells.length).reduce((a, b) => a + b, 0)
  const unselectedCount = totalCount - selectedCount
  return {
    name: '',
    isRemainder: true,
    count: unselectedCount,
    cells: []
  }
}

/** returns a list of validation messages.  If empty, the submission is valid */
function validationMessages(userAnnotations, annotationName, annotations) {
  const msgs = []
  if (userAnnotations.length < 2) {
    msgs.push('Drag on a scatter plot to select a group of cells.')
    // don't clutter with extra messages if they haven't done anything yet
    return msgs
  }
  if (userAnnotations.some(annot => annot.name.length < 1)) {
    msgs.push('Label all selections.')
  }
  if (userAnnotations.some(annot => annot.name === 'Undefined')) {
    msgs.push('"Undefined" may not be used as a label.')
  }
  if (annotationName.length < 1) {
    msgs.push('Enter a name for this annotation')
  }
  const existingAnnotNames = annotations.map(annot => annot.name)
  if (existingAnnotNames.includes(annotationName)) {
    msgs.push(`${annotationName} already exists. Select a different name.`)
  }
  return msgs
}


/** the graph customization controls for the exlore tab */
export default function CreateAnnotation({ isSelecting, setIsSelecting, currentPointsSelected, annotations }) {
  const [showControl, setShowControl] = useState(false)
  const [userAnnotations, setUserAnnotations] = useState([])
  const [annotationName, setAnnotationName] = useState('')
  const [plotlyTarget, setPlotlyTarget] = useState(null)

  const messages = validationMessages(userAnnotations, annotationName, annotations)
  const isCreateEnabled = messages.length === 0

  /** handle the use3r updating the name of one of the annotations */
  function setLabelName(name, annotIndex) {
    const newUserAnnots = userAnnotations.map((annot, index) => {
      return {
        name: index === annotIndex ? name : annot.name,
        cells: annot.cells,
        isRemainder: annot.isRemainder,
        count: annot.count
      }
    })
    setUserAnnotations(newUserAnnots)
  }

  /** user cancels creating an annotation */
  function handleCancel() {
    setUserAnnotations([])
    setAnnotationName('')
  }

  function handleCreate() {
    // do stuff
  }

  /** creates a new label entry for the given cell names */
  function addNewLabel(cellNames, allTraces) {
    if (cellNames.length) {
      const newAnnot = {
        name: '',
        cells: cellNames
      }
      // update previous selections to make sure they don't include duplicate cell names
      const newUserAnnots = userAnnotations.filter(annot => !annot.isRemainder).map(annot => {
        return {
          name: annot.name,
          cells: _difference(annot.cells, cellNames)
        }
      })
      newUserAnnots.unshift(newAnnot)
      newUserAnnots.push(computeRemainderLabel(newUserAnnots, allTraces))
      setUserAnnotations(newUserAnnots)
      setPlotlyTarget()
    }
  }

  /** handle expand/collapse of the controls */
  function handlePanelToggle() {
    if (showControl) {
      setIsSelecting(false)
    } else {
      setIsSelecting(true)
    }
    setShowControl(!showControl)
  }

  /** handle deletion of a label */
  function handleDelete(deleteIndex) {
    if (userAnnotations.length === 2) {
      // use is deleting the only annotation they've made so far (there exist only that and the remainder)
      setUserAnnotations([])
    } else {
      // build new array of non-deleted labels, and without the 'remainder' label
      const newUserAnnots = userAnnotations.filter((annot, index) => index != deleteIndex && !annot.isRemainder)
      newUserAnnots.push(computeRemainderLabel(newUserAnnots, plotlyTarget.data))
      setUserAnnotations(newUserAnnots)
    }
  }

  useUpdateEffect(() => {
    const target = currentPointsSelected.target
    const selectedCells = getSelectedCells(target)
    addNewLabel(selectedCells, target.data)
    setPlotlyTarget(target)
  }, [currentPointsSelected])

  let createButton = (<button className="action" onClick={handlePanelToggle}>
    <FontAwesomeIcon icon={showControl ? faMinus : faPlus}/> Create annotation
  </button>)
  if (!isUserLoggedIn()) {
    createButton = <button className="action"
      data-toggle="tooltip"
      title="You must sign in to create custom annotations">
      <FontAwesomeIcon icon={faPlus}/> Create annotation
    </button>
  }

  return (
    <div className="create-annotation-control">
      {createButton }
      <Panel className="create-annotation" expanded={showControl} onToggle={handlePanelToggle}>
        <Panel.Collapse>
          <Panel.Body>
            <input
              type="text"
              value={annotationName}
              placeholder="Name this annotation"
              onChange={event => setAnnotationName(event.target.value)}/>
            <label htmlFor="annotation-select-cells">Selecting Cells
              <Switch
                checked={isSelecting}
                onChange={selected => setIsSelecting(selected)}
                className="react-switch"
                height={20}
                id="annotation-select-cells"/>
            </label>

            { userAnnotations.map((annotation, index) => {
              return <UserLabelInput
                key={index}
                annotation={annotation}
                index={index}
                setName={setLabelName}
                deleteLabel={handleDelete}/>
            })}
            <ul className="detail">
              {messages.map(msg => <li>{msg}</li>)}
            </ul>
            <button className="btn btn-primary" disabled={!isCreateEnabled} onClick={handleCreate}>Create</button>
            &nbsp;
            <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </div>
  )
}

/** component for input of an annotation grouping */
function UserLabelInput({ annotation, index, setName, deleteLabel }) {
  let labelText = ''
  if (annotation.isRemainder) {
    labelText = `Unselected: ${annotation.count} cells`
  } else {
    labelText = `Selection ${index}: ${annotation.cells.length} cells`
  }
  /** handle text change from the input */
  function updateName(event) {
    setName(event.target.value, index)
  }

  return (
    <div>
      <label htmlFor={`annotation-label-input-${index}`}>
        <span>{labelText}</span>
      </label>
      <div className="flexbox">
        <input
          id={`annotation-label-input-${index}`}
          type="text"
          value={annotation.name}
          placeholder="label these cells"
          onChange={updateName}/>
        { !annotation.isRemainder &&
          <button onClick={() => deleteLabel(index)}
            className="delete-icon"
            data-analytics-name="user-annotation-cancel"
            title="delete this label">
            <FontAwesomeIcon icon={faTimes}/>
          </button> }
      </div>
    </div>
  )
}
