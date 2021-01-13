/**
 * Render Morpheus heatmap
 */
function renderHeatmap(
  dataPath, annotPath, selectedAnnot, selectedAnnotType, target, annotations,
  fitType, heatmapHeight, colorScaleMode
) {
  console.log(
    `render status of ${target} at start: ${$(target).data('rendered')}`
  )
  $(target).empty()
  console.log(`scaling mode: ${colorScaleMode}`)
  const config = {
    name: 'Heatmap',
    dataset: dataPath,
    el: $(target),
    menu: null,
    colorScheme: { scalingMode: colorScaleMode }
  }

  // set height if specified, otherwise use default setting of 500 px
  if (heatmapHeight !== undefined) {
    config.height = heatmapHeight
  } else {
    config.height = 500
  }

  // fit rows, columns, or both to screen
  if (fitType === 'cols') {
    config.columnSize = 'fit'
  } else if (fitType === 'rows') {
    config.rowSize = 'fit'
  } else if (fitType === 'both') {
    config.columnSize = 'fit'
    config.rowSize = 'fit'
  } else {
    config.columnSize = null
    config.rowSize = null
  }

  // load annotations if specified
  if (annotPath !== '') {
    config.columnAnnotations = [{
      file: annotPath,
      datasetField: 'id',
      fileField: 'NAME',
      include: [selectedAnnot]
    }]
    config.columnSortBy = [
      { field: selectedAnnot, order: 0 }
    ]
    config.columns = [
      { field: 'id', display: 'text' },
      { field: selectedAnnot, display: selectedAnnotType === 'group' ? 'color' : 'bar' }
    ]
    // create mapping of selected annotations to colorBrewer colors
    const annotColorModel = {}
    annotColorModel[selectedAnnot] = {}
    const sortedAnnots = annotations['values'].sort()

    // calling % 27 will always return to the beginning of colorBrewerSet once we use all 27 values
    $(sortedAnnots).each((index, annot) => {
      annotColorModel[selectedAnnot][annot] = colorBrewerSet[index % 27]
    })
    config.columnColorModel = annotColorModel
  }

  // instantiate heatmap and embed in DOM element
  const heatmap = new morpheus.HeatMap(config)

  // set render variable to true for tests
  $(target).data('morpheus', heatmap)
  $(target).data('rendered', true)
  console.log(`render status of ${target} at end: ${$(target).data('rendered')}`)
}
