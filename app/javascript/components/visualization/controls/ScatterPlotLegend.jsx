import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPalette } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import _cloneDeep from 'lodash/cloneDeep'
// import LegendSearch from './LegendSearch'

import { log } from '~/lib/metrics-api'
import PlotUtils from '~/lib/plot'
const { scatterLabelLegendWidth, getColorForLabel, getLegendSortedLabels } = PlotUtils

/** Convert state Boolean to attribute string */
function getActivity(isActive) {
  return isActive ? 'active' : 'disabled'
}

/** Component for row in legend */
function LegendEntry({
  label, numPoints, iconColor, correlations,
  numLabels, hiddenTraces, updateHiddenTraces, showColorControls, updateEditedCustomColors, setActiveTraceLabel
}) {
  let entry = label
  // whether to show the color picker modal
  const [showColorPicker, setShowColorPicker] = useState(false)
  // the current user-picked (though not necessarily saved) color
  // note that the color picker components do not allow invalid inputs, so we don't need to do any additional validation
  const [pickedColor, setPickedColor] = useState(iconColor)
  const hasCorrelations = correlations !== null
  if (correlations) {
    const correlation = Math.round(correlations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints} points, ρ = ${correlation})`
  }

  const isShown = hiddenTraces.includes(label)

  const iconStyle = { backgroundColor: iconColor }
  const shownClass = (isShown ? '' : 'shown')

  /** Toggle state of this legend filter, and accordingly upstream */
  function toggleSelection(event) {
    const wasShown = !isShown
    updateHiddenTraces(label, wasShown)

    const legendEntry = {
      label, numPoints, numLabels, wasShown, iconColor,
      hasCorrelations
    }
    log('click:scatterlegend:single', legendEntry)
  }

  /** handle 'ok' press by updating the colors to the parent, and closing the dialog */
  function handleColorPicked() {
    updateEditedCustomColors(label, pickedColor)
    setShowColorPicker(false)
  }

  // clicking the label will either hide the trace, or pop up a color picker
  const entryClickFunction = showColorControls ? () => setShowColorPicker(true) : toggleSelection
  return (
    <>
      <div
        className={`scatter-legend-row ${shownClass}`}
        role="button"
        onClick={entryClickFunction}
        onMouseEnter={() => setActiveTraceLabel(label)}
        onMouseLeave={() => setActiveTraceLabel(null)}
      >
        <div className="scatter-legend-icon" style={iconStyle}>
          { showColorControls && <FontAwesomeIcon icon={faPalette} title="Change the color for this label"/> }
        </div>
        <div className="scatter-legend-entry">
          <span className="legend-label" title={entry}>{entry}</span>
          <span className="num-points" title={`${numPoints} points in this group`}>{numPoints}</span>
        </div>
      </div>
      { showColorPicker &&
        <Modal
          id='color-picker-modal'
          show={showColorPicker}
          onHide={() => setShowColorPicker(false)}
          animation={false}
          bsSize='small'>
          <Modal.Body>
            <div className="flexbox-align-center flexbox-column">
              <span>Select color</span>
              <span className="flexbox-align-center">
                #<HexColorInput color={pickedColor} onChange={setPickedColor}/>
                &nbsp;
                <span className="preview-block" style={{ background: pickedColor }}></span>
              </span>
              <HexColorPicker color={pickedColor} onChange={setPickedColor}/>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn btn-primary" onClick={handleColorPicked}>OK</button>
            <button className="btn terra-btn-secondary" onClick={() => setShowColorPicker(false)}>Cancel</button>
          </Modal.Footer>
        </Modal>
      }
    </>
  )
}

/** Handle click on "Show all" or "Hide all" button */
function showHideAll(showOrHide, labels, updateHiddenTraces) {
  if (showOrHide === 'show') {
    updateHiddenTraces(labels, false, true)
  } else {
    updateHiddenTraces(labels, true, true)
  }
}

/** Get status of "Show all" and "Hide all" links */
function getShowHideEnabled(hiddenTraces, countsByLabel) {
  const numHiddenTraces = hiddenTraces.length
  const numLabels = Object.keys(countsByLabel).length

  let enabled = [true, true] // [isShowAllEnabled, isHideAllEnabled]

  if (countsByLabel === null) {
    // When nothing has loaded yet
    enabled = [false, false]
  } else if (numHiddenTraces === numLabels) {
    // When all groups are hidden
    enabled = [true, false]
  } else if (numHiddenTraces < numLabels && numHiddenTraces > 0) {
    // When some groups are hidden and some are shown
    enabled = [true, true]
  } else if (numHiddenTraces === 0) {
    // When no groups are hidden
    enabled = [false, true]
  }

  return enabled
}


/** Component for custom legend for scatter plots */
export default function ScatterPlotLegend({
  name, height, countsByLabel, correlations, hiddenTraces,
  updateHiddenTraces, customColors, editedCustomColors, setEditedCustomColors,
  enableColorPicking=false, saveCustomColors, activeTraceLabel, setActiveTraceLabel,
  splitLabelArrays, setSplitLabelArrays, hasArrayLabels
}) {
  // is the user currently in color-editing mode
  const [showColorControls, setShowColorControls] = useState(false)
  // whether a request to the server to save colors is pending
  const labels = getLegendSortedLabels(countsByLabel)
  const numLabels = labels.length

  // setLegendLabels(labels)
  const [foundLabels, setFoundLabels] = useState(labels)

  const style = { width: scatterLabelLegendWidth, height }
  const filteredClass = (hiddenTraces.length === 0) ? 'unfiltered' : ''
  const [showIsEnabled, hideIsEnabled] =
    getShowHideEnabled(hiddenTraces, countsByLabel)

  /** updates the user picked color for the given label.  does *not* save change to the server */
  function updateEditedCustomColors(label, color) {
    const newColors = _cloneDeep(editedCustomColors)
    newColors[label] = color
    setEditedCustomColors(newColors)
  }

  /** resets any unsaved changes to user colors */
  function cancelColors() {
    setEditedCustomColors({})
    setShowColorControls(false)
  }

  /** resets any unsaved changes to user colors and clears custom colors */
  function resetColors() {
    setEditedCustomColors({})
    saveCustomColors({})
    setShowColorControls(false)
  }

  /** save the colors to the server */
  function saveColors() {
    // merge the user picked colors with existing custom colors so previously saved values are preserved
    const colorsToSave = _cloneDeep(customColors)
    Object.assign(colorsToSave, editedCustomColors)
    setShowColorControls(false)
    saveCustomColors(colorsToSave)
  }

  /** collect general information when a user's mouse enters the legend  */
  function logMouseEnter() {
    log('hover:scatterlegend', { numLabels })
  }

  /** */
  function LegendSearch() {
    const [filter, setFilter] = useState('')
    const filteredLabels = labels.filter(f => f.toLowerCase().includes(filter.toLowerCase()) || filter === '')

    return (
      <div>
        <input id="filter"
          name="filter"
          type="text"
          value={filter}
          onChange={event => setFilter(event.target.value)}
        />
        {filteredLabels.map((label, i) => {
          const numPoints = countsByLabel[label]
          const iconColor = getColorForLabel(label, customColors, editedCustomColors, i)
          return (
            <LegendEntry
              key={label}
              label={label}
              numPoints={numPoints}
              iconColor={iconColor}
              correlations={correlations}
              hiddenTraces={hiddenTraces}
              updateHiddenTraces={updateHiddenTraces}
              numLabels={numLabels}
              updateEditedCustomColors={updateEditedCustomColors}
              showColorControls={showColorControls}
              setActiveTraceLabel={setActiveTraceLabel}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={`scatter-legend ${filteredClass}`}
      onMouseEnter={logMouseEnter}
      style={style}>
      <div className="scatter-legend-head">
        <div>
          <p className="scatter-legend-name">{name}</p>
          {labels.length > 1 && !showColorControls &&
          <>
            <a
              role="button"
              data-analytics-name='legend-show-all'
              className={`stateful-link ${getActivity(showIsEnabled)}`}
              disabled={!showIsEnabled}
              onClick={() => {showHideAll('show', labels, updateHiddenTraces)}}
            >Show all</a>
            <a
              role="button"
              data-analytics-name='legend-hide-all'
              className={`stateful-link pull-right ${getActivity(hideIsEnabled)}`}
              disabled={!hideIsEnabled}
              onClick={() => {showHideAll('hide', labels, updateHiddenTraces)}}
            >Hide all</a>
          </>
          }
        </div>
        { hasArrayLabels &&
          <div>
            { splitLabelArrays &&
              <a
                role="button"
                data-analytics-name='split-traces-unsplit'
                onClick={() => {updateHiddenTraces([], false, true); setSplitLabelArrays(false)}}
              >Merge array labels</a>
            }
            { !splitLabelArrays &&
              <a
                role="button"
                data-analytics-name='split-traces-split'
                onClick={() => {updateHiddenTraces([], false, true); setSplitLabelArrays(true)}}
              >Split array labels</a>
            }
          </div>
        }
        { enableColorPicking &&
          <div>
            { showColorControls &&
              <>
                <span>Click a label to select a new color</span><br/>
                <div>
                  <a role="button" data-analytics-name="legend-color-picker-save" onClick={saveColors}>
                    Save colors
                  </a>
                  <a role="button" className="pull-right" data-analytics-name="legend-color-picker-cancel" onClick={cancelColors}>
                    Cancel
                  </a><br/>
                  &nbsp;
                  <a role="button" className="pull-right" data-analytics-name="legend-color-picker-reset" onClick={resetColors}>
                    Reset to defaults
                  </a>
                </div>
              </>
            }
            { !showColorControls &&
              <a role="button" data-analytics-name="legend-color-picker-show" onClick={() => setShowColorControls(true)}>
                Customize colors <FontAwesomeIcon icon={faPalette}/>
              </a>
            }
          </div>
        }
        <div>{<LegendSearch ></LegendSearch>}</div>
      </div>
    </div>
  )
}
