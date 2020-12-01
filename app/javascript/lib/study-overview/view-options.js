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
