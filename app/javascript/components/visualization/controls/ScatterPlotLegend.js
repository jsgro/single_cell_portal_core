import React, { useState } from 'react'
import { log } from 'lib/metrics-api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPalette, faSave } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { store } from 'react-notifications-component'

import { UNSPECIFIED_ANNOTATION_NAME } from 'lib/cluster-utils'
import { getColorBrewerColor, scatterLabelLegendWidth } from 'lib/plot'
import { formatFileForApi } from 'components/upload/upload-utils'
import { updateStudyFile } from 'lib/scp-api'
import { successNotification, failureNotification } from 'lib/MessageModal'
import LoadingSpinner from 'lib/LoadingSpinner'

/** Sort annotation labels naturally, but always put "unspecified" last */
function labelSort(a, b) {
  if (a === UNSPECIFIED_ANNOTATION_NAME) {return 1}
  if (b === UNSPECIFIED_ANNOTATION_NAME) {return -1}
  return a.localeCompare(b, 'en', { numeric: true, ignorePunctuation: true })
}

/**
 * Return a hash of value=>count for the passed-in array
 * This is surprisingly quick even for large arrays, but we'd rather we
 * didn't have to do this.  See https://github.com/plotly/plotly.js/issues/5612
*/
function countValues(array) {
  return array.reduce((acc, curr) => {
    acc[curr] ||= 0
    acc[curr] += 1
    return acc
  }, {})
}

/** Sort labels colors are assigned in right order */
function getLabels(countsByLabel) {
  return Object.keys(countsByLabel).sort(labelSort)
}

/** Convert state Boolean to attribute string */
function getActivity(isActive) {
  return isActive ? 'active' : 'disabled'
}

/**
 * Get value for `style` prop in Plotly scatter plot `trace.transforms`.
 * Also calculate point counts for each label, `countsByLabel`.
 *
 * This is needed so that colors match between the custom Plotly legend
 * entries and each graphical trace in the plot.  (Without this, point
 * set "Foo" could be green in the legend, but red in the plot.)
 *
*/
export function getStyles(data, pointSize, customColors, userPickedColors) {
  const countsByLabel = countValues(data.annotations)

  const labels = getLabels(countsByLabel)

  const legendStyles = labels
    .map((label, index) => {
      return {
        target: label,
        value: {
          legendrank: index,
          marker: {
            color: getColorForLabel(label, customColors, userPickedColors, index),
            size: pointSize
          }
        }
      }
    })

  return [legendStyles, countsByLabel]
}

/** Component for row in legend */
function LegendEntry({
  label, numPoints, iconColor, correlations,
  numLabels, hiddenTraces, updateHiddenTraces, showColorControls, updateUserPickedColors
}) {
  let entry = label
  const [showColorPicker, setShowColorPicker] = useState(false)
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
    updateUserPickedColors(label, pickedColor)
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
              <span>Edit or select color</span>
              <span className="flexbox-align-center">
                #<HexColorInput color={pickedColor} onChange={setPickedColor}/>
                &nbsp;
                <span className="preview-block" style={{ background: pickedColor }}></span>
              </span>
              <HexColorPicker color={pickedColor} onChange={setPickedColor}/>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn btn-primary" onClick={handleColorPicked}>Ok</button>
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

  let enabled // [isShowAllEnabled, isHideAllEnabled]

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

/**
 * Get color for the label, which can be applied to e.g. the icon or the trace
 */
function getColorForLabel(label, customColors={}, userPickedColors={}, i) {
  return userPickedColors[label] ?? customColors[label] ?? getColorBrewerColor(i)
}

/** Component for custom legend for scatter plots */
export default function ScatterPlotLegend({
  name, height, countsByLabel, correlations, hiddenTraces,
  updateHiddenTraces, customColors, studyAccession, clusterFileId, userPickedColors, setUserPickedColors,
  enableColorPicking=false
}) {
  const [showColorControls, setShowColorControls] = useState(false)
  const [isColorSaving, setIsColorSaving] = useState(false)
  const labels = getLabels(countsByLabel)
  const numLabels = labels.length

  const legendEntries = labels
    .map((label, i) => {
      const numPoints = countsByLabel[label]
      const iconColor = getColorForLabel(label, customColors, userPickedColors, i)

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
          updateUserPickedColors={updateUserPickedColors}
          showColorControls={showColorControls}
        />
      )
    })

  const style = { width: scatterLabelLegendWidth, height }
  const filteredClass = (hiddenTraces.length === 0) ? 'unfiltered' : ''
  const [showIsEnabled, hideIsEnabled] =
    getShowHideEnabled(hiddenTraces, countsByLabel)

  /** Save any changes to the legend colors */
  async function saveColors() {
    const colorObj = {}
    // merge the user picked colors with existing custom colors so previously saved values are preserved
    colorObj[name] = Object.assign({}, customColors, userPickedColors)
    const newFileObj = {
      _id: clusterFileId,
      custom_color_updates: colorObj
    }
    setIsColorSaving(true)
    try {
      await updateStudyFile({ studyAccession, studyFileId: clusterFileId, studyFileData: formatFileForApi(newFileObj) })
      store.addNotification(successNotification(`Colors saved successfully`))
    } catch (error) {
      store.addNotification(failureNotification(<span>Error saving colors<br/>{error}</span>))
    }

    setIsColorSaving(false)
    setShowColorControls(false)
  }

  /** updates the user picked color for the given label.  does *not* save change to the server */
  function updateUserPickedColors(label, color) {
    const newColors = Object.assign({}, userPickedColors)
    newColors[label] = color
    setUserPickedColors(newColors)
  }

  /** resets any unsaved changes to user colors */
  function cancelColors() {
    setUserPickedColors({})
    setShowColorControls(false)
  }


  return (
    <div
      className={`scatter-legend ${filteredClass}`}
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
        { enableColorPicking &&
          <div>
            { showColorControls && !isColorSaving &&
              <>
                <span>Click a label to select a new color</span><br/>
                <div>
                  <a role="button" data-analytics-name="legend-color-picking-save" onClick={saveColors}>
                    Save colors <FontAwesomeIcon icon={faSave}/>
                  </a>
                  <a role="button" className="pull-right" data-analytics-name="legend-color-picking-save" onClick={cancelColors}>
                    Cancel
                  </a>
                </div>
              </>
            }
            { showColorControls && isColorSaving &&
              <LoadingSpinner/>
            }
            { !showColorControls &&
              <a role="button" data-analytics-name="legend-color-picking-show" onClick={() => setShowColorControls(true)}>
                Customize colors <FontAwesomeIcon icon={faPalette}/>
              </a>
            }
          </div>
        }
      </div>
      {legendEntries}
    </div>
  )
}
