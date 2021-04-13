/**
 * @fileoverview Ideogram for related genes
 *
 * Show an Ideogram heatmap instance using output from an inferCNV workflow
 */

import React, { useEffect, useState } from 'react'
import _uniqueId from 'lodash/uniqueId'

import Ideogram from 'ideogram'
import { profileWarning } from 'lib/study-overview/terra-profile-warning'

/* eslint-disable no-unused-vars */

let inferCNVIdeogram
let checkboxes
let ideoConfig
let adjustedExpressionThreshold
let chrMargin
let expressionThreshold

// default minimum size of chromosomes in ideogram
const minChrHeight = 64

const legend = [{
  name: 'Expression level',
  rows: [
    { name: 'Low', color: '#00B' },
    { name: 'Normal', color: '#DDD' },
    { name: 'High', color: '#F00' }
  ]
}]

export default function InferCNVIdeogram({ studyAccession, ideogramFileId, inferCNVIdeogramFiles, showViewOptionsControls }) {
  const [ideogramContainerId] = useState(_uniqueId('study-infercnv-ideogram-'))
  const [showProfileWarning, setShowProfileWarning] = useState(false)
  const inferCNVIdeogramFile = inferCNVIdeogramFiles[ideogramFileId]


  useEffect(() => {
    if (inferCNVIdeogramFile) {
      setInitializeIdeogram(inferCNVIdeogramFile, ideogramContainerId, showViewOptionsControls)
    } else {
      removeIdeogram()
    }
  }, [ideogramFileId, showViewOptionsControls])

  useEffect(() => {
    if (!ideogramFileId && Object.entries(inferCNVIdeogramFiles).length > 0) {
      // find the first ideogram annotations file and pre-render since Ideogram can render on a hidden div
      const firstIdeogramFile = Object.entries(inferCNVIdeogramFiles)[0][1]
      if (window.accessToken === '') {
        setShowProfileWarning(true)
      }
      if (firstIdeogramFile) {
        setInitializeIdeogram(firstIdeogramFile, ideogramContainerId, showViewOptionsControls)
      }
    }
  }, [inferCNVIdeogramFiles])

  return <div id="ideogram-container">
    <div id={ideogramContainerId}>
      <ul id="tracks-to-display">
      </ul>
    </div>
    { showProfileWarning && profileWarning }
  </div>
}

/** Setter for initializeIdeogram params */
function setInitializeIdeogram(ideogramFileConfig, ideogramContainerId, showViewOptionsControls) {
  const ideogramAnnotsFile = ideogramFileConfig.ideogram_settings.annotationsPath
  const ideogramOrganism = ideogramFileConfig.ideogram_settings.organism
  const ideogramAssembly = ideogramFileConfig.ideogram_settings.assembly
  initializeIdeogram(ideogramAnnotsFile, ideogramOrganism, ideogramAssembly, ideogramContainerId, showViewOptionsControls)
}

/** Get ideogram heatmap tracks selected via checkbox */
function getSelectedTracks() {
  const selectedTracks = []

  checkboxes.forEach(checkbox => {
    const trackIndex = parseInt(checkbox.getAttribute('id').split('_')[1])
    if (checkbox.checked) {
      selectedTracks.push(trackIndex)
    }
  })

  return selectedTracks
}

/** Set selected tracks as displayed tracks */
function updateTracks() {
  const selectedTracks = getSelectedTracks()
  inferCNVIdeogram.updateDisplayedTracks(selectedTracks)
}

/** Update space between chromosomes; called upon updating related slider */
function updateMargin(event) {
  chrMargin = parseInt(event.target.value)
  ideoConfig.chrMargin = chrMargin
  inferCNVIdeogram = new Ideogram(ideoConfig)
}

/** Create a slider to adjust space between chromosomes */
function addMarginControl() {
  chrMargin = (typeof chrMargin === 'undefined' ? 10 : chrMargin)
  const marginSlider =
    `<label
          id="chrMarginContainer"
          style="float:left; position: relative; top: 50px; left: -130px;">
        Chromosome margin
      <input
        type="range"
        id="chrMargin"
        list="chrMarginList" value="${chrMargin}">
      </label>
      <datalist id="chrMarginList">
        <option value="0" label="0%">
        <option value="10">
        <option value="20">
        <option value="30">
        <option value="40">
        <option value="50" label="50%">
        <option value="60">
        <option value="70">
        <option value="80">
        <option value="90">
        <option value="100" label="100%">
      </datalist>`
  d3.select('#_ideogramLegend').node().innerHTML += marginSlider
}

/** Change expression threshold; called upon updating related slider */
function updateThreshold(event) {
  let newThreshold

  expressionThreshold = parseInt(event.target.value)

  adjustedExpressionThreshold = Math.round(expressionThreshold/10 - 4)
  const thresholds = window.originalHeatmapThresholds
  const numThresholds = thresholds.length
  ideoConfig.heatmapThresholds = []

  // If expressionThreshold > 1,
  //    increase thresholds above middle, decrease below
  // If expressionThreshold < 1,
  //    decrease thresholds above middle, increase below
  for (let i = 0; i < numThresholds; i++) {
    if (i + 1 > numThresholds/2) {
      newThreshold = thresholds[i + adjustedExpressionThreshold]
    } else {
      newThreshold = thresholds[i - adjustedExpressionThreshold]
    }
    ideoConfig.heatmapThresholds.push(newThreshold)
  }
  inferCNVIdeogram = new Ideogram(ideoConfig)
}

/** Create slider to adjust expression threshold for "gain" or "loss" calls */
function addThresholdControl() {
  if (typeof expressionThreshold === 'undefined') {
    expressionThreshold = 50
    window.originalHeatmapThresholds =
      inferCNVIdeogram.rawAnnots.metadata.heatmapThresholds
  }

  const expressionThresholdSlider =
    `<label id="expressionThresholdContainer" style="float: left">
      <span
        class="glossary"
        title="Denoiser.  Adjusts mapping between inferCNV's output heatmap
          threshold values and normal vs. loss/gain signal.  Analogous to
          inferCNV denoise parameters, e.g. --noise_filter."
        style="cursor: help;">
      Expression threshold
      </span>
      <input
        type="range"
        id="expressionThreshold"
        list="expressionThresholdList"
        value="${expressionThreshold}"
      >
      <datalist id="expressionThresholdList">
        <option value="0" label="0.">
        <option value="10">
        <option value="20">
        <option value="30">
        <option value="40">
        <option value="50" label="1">
        <option value="60">
        <option value="70">
        <option value="80">
        <option value="90">
        <option value="100" label="1.5">
      </datalist>
      <br/><br/>`
  d3.select('#_ideogramLegend').node().innerHTML += expressionThresholdSlider
}

/** Handle updates to slider controls for ideogram display */
function ideoRangeChangeEventHandler(event) {
  const id = event.target.id
  if (id === 'expressionThreshold') {updateThreshold(event)}
  if (id === 'chrMargin') {updateMargin(event)}
}

/** Add sliders to adjust ideogram display */
function addIdeoRangeControls() {
  addThresholdControl()
  addMarginControl()

  document.removeEventListener('change', ideoRangeChangeEventHandler)
  document.addEventListener('change', ideoRangeChangeEventHandler)
}

/** Create interactive filters for ideogram tracks */
function createTrackFilters() {
  let i; let listItems; let checked

  addIdeoRangeControls()

  // Only apply this function once
  if (document.querySelector('#filter_1')) {return}
  listItems = ''
  const trackLabels = inferCNVIdeogram.rawAnnots.keys.slice(6)
  const displayedTracks = inferCNVIdeogram.config.annotationsDisplayedTracks
  for (i = 0; i < trackLabels.length; i++) {
    checked = (displayedTracks.includes(i + 1)) ? 'checked' : ''
    listItems +=
      `${'<li>' +
      '<label for="filter_'}${i + 1}">` +
      `<input type="checkbox" id="filter_${i + 1}" ${checked}/>${
        trackLabels[i]
      }</label>` +
      `</li>`
  }
  const content = `Tracks ${listItems}`
  document.querySelector('#tracks-to-display').innerHTML = content


  $('#filters-container').after(
    '<div id="ideogramTitle">Copy number variation inference</div>'
  )

  checkboxes = document.querySelectorAll('input[type=checkbox]')
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('click', () => {
      updateTracks()
    })
  })
}

/**
 * Note ideogram is unavailable for this numeric cluster
 */
function warnIdeogramOfNumericCluster() {
  const cluster = $('#cluster option:selected').val()
  const cellAnnot = $('#annotation option:selected').val()

  const warning =
    `${'<div id="ideogramWarning" style="height: 400px; margin-left: 20px;">' +
    'Ideogram not available for selected cluster ("'}${cluster}") and ` +
    `cell annotation ("${cellAnnot}").` +
    `</div>`

  removeIdeogram()
  $('#ideogram-container').append(warning)
}

// remove the ideogram DOM element from the page
function removeIdeogram() {
  $('#tracks-to-display, #_ideogramOuterWrap').html('')
  $('#ideogramWarning, #ideogramTitle').remove()
}

/** Initialize ideogram to visualize genomic heatmap from inferCNV  */
function initializeIdeogram(url, organism, assembly, domTarget, showViewOptionsControls) {
  if (typeof window.inferCNVIdeogram !== 'undefined') {
    delete window.inferCNVIdeogram
    removeIdeogram()
  }

  const chrHeight = showViewOptionsControls ? 64 : 80
  $('#ideogramWarning, #ideogramTitle').remove()

  ideoConfig = {
    container: `#${domTarget}`,
    organism: organism.toLowerCase(),
    assembly,
    annotationsPath: url,
    annotationsLayout: 'heatmap',
    legend,
    onDrawAnnots: createTrackFilters,
    debug: true,
    rotatable: false,
    chrMargin: 10,
    chrHeight,
    annotationHeight: 20,
    geometry: 'collinear',
    orientation: 'horizontal'
  }

  inferCNVIdeogram = new Ideogram(ideoConfig)
  window.inferCNVIdeogram = inferCNVIdeogram

  window.SCP.log('ideogram:initialize')
}

