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
