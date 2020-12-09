import { setScatterPlotColorScales } from 'lib/scatter-plot'

/** Get selections for top-level view options */
export function getMainViewOptions(plotIndex) {
  let cluster
  if (plotIndex === 0) {
    cluster = $('#cluster').val()
  } else {
    cluster = $('#spatial-group').val()
  }

  const annotation = $('#annotation').val()
  const subsample = $('#subsample').val()

  return { cluster, annotation, subsample }
}

/** Get name, type, and scope of currently-selected annotation */
export function getAnnotParams() {
  const [name, type, scope] = $('#annotation').val().split('--')
  return { name, type, scope }
}

/** Get HTML for dropdown menu for spatial files */
function getSpatialDropdown(study) {
  const options = study.spatialGroupNames.map(name => {
    return `<option value="${name}">${name}</option>`
  })
  const domId = 'spatial-group'
  const select =
    `<select name="${domId}" id="${domId}" class="form-control">${
      options
    }</select>`
  return (
    `<div class="form-group col-sm-4">` +
    `<label for=${domId}>Spatial group</label><br/>${select}` +
    `</div>`
  )
}

/** Add dropdown menu for spatial files */
export function addSpatialDropdown(study) {
  if (study.spatialGroupNames.length > 0) {
    const dropdown = getSpatialDropdown(study)
    $('#view-options #precomputed-panel #precomputed .row').append(dropdown)
  }
}

/**
 * Re-render a plot after a user selects a new cluster from the dropdown menu,
 * usually called from a complete() callback in an $.ajax() function
 */
export function updateCluster(
  callback, callbackArgs, setAnnotation=true
) {
  if (setAnnotation) {
    const an = $('#annotation').val()
    $('#search_annotation').val(an)
    $('#gene_set_annotation').val(an)
  }
  callback(...callbackArgs)
}

/**
 * Event handler for changes to "Load cluster" menu.  Fetch new annotations,
 * then render dynamically-specified plots for selected cluster.
 *
 * @param {Function} callback Function to call after fetching new annots
 * @param {Array} callbackArgs List of arguments for `callback` function
 */
function handleClusterMenuChange(callback, callbackArgs) {
  $(document).off('change', '#cluster')
  $(document).on('change', '#cluster', function() {
    const cluster = $(this).val() // eslint-disable-line
    const subsample = $('#subsample').val()
    // keep track for search purposes
    $('#search_cluster').val(cluster)
    $('#gene_set_cluster').val(cluster)
    const url =
      `${window.location.pathname}/get_new_annotations` +
      `?cluster=${encodeURIComponent(cluster)}&` +
      `subsample=${encodeURIComponent(subsample)}`
    $.ajax({
      url,
      dataType: 'script',
      success() {
        updateCluster(callback, callbackArgs)
      }
    })
  })
}

/** Handle menu changes for annotations, subsampling, and spatial groups */
function handleOtherMenuChange(callback, callbackArgs) {
  const menuSelectors = '#annotation, #subsample, #spatial-group'
  $(document).off('change', menuSelectors)
  $(document).on('change', menuSelectors, function() {
    const menu = $(this) // eslint-disable-line
    const newValue = menu.val()
    // keep track for search purposes
    $(`#search_${menu.id}`).val(newValue)
    $(`#gene_set_${menu.id}`).val(newValue)
    callback(...callbackArgs)
  })
}

/**
 * Event handler for new selections in menus for:
 *  - Load cluster
 *  - Select annotation
 *  - Subsampling threshold
 *  - Spatial group
 *
 * @param {Function} callback Function to call after fetching new annots
 * @param {Array} callbackArgs List of arguments for `callback` function
 */
export function handleMenuChange(callback, callbackArgs) {
  handleClusterMenuChange(callback, callbackArgs)
  handleOtherMenuChange(callback, callbackArgs)


  // listener to redraw expression scatter with new color profile
  $('#colorscale').change(function() {
  const theme = $(this).val() // eslint-disable-line
    setScatterPlotColorScales(theme)
  })
}
