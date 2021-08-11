import SpearmanRho from 'spearman-rho'

window.spearman = SpearmanRho

/** Get map of scatter plot coordinates by annotation label */
function getValuesByLabel(scatter) {
  console.log('in gvbt, scatter:', scatter)
  const valuesByLabel = {}

  const { annotations, cells, x, y } = scatter.data
  x.forEach((xVal, i) => {
    const yVal = y[i]
    const label = annotations[i]
    if (label in valuesByLabel) {
      valuesByLabel[label].x.push(xVal)
      valuesByLabel[label].y.push(yVal)
    } else {
      valuesByLabel[label] = { x: [xVal], y: [yVal] }
    }
  })

  return valuesByLabel
}

/** Computes Spearman correlations, then push state upstream */
export function computeCorrelations(scatter, callback) {
// compute correlation stats asynchronously so it doesn't delay
  // rendering of other visualizations or impact logging
  // in the event these stats become more complex or widely used, consider instrumentation strategies
  const spearmanRho = new SpearmanRho(scatter.data.x, scatter.data.y)
  spearmanRho.calc().then(value => callback(value))

  // Compute per-label correlations
  const valuesByLabel = getValuesByLabel(scatter)
  const correlationsByLabel = {}
  Object.entries(valuesByLabel).forEach(([label, xyVals]) => {
    const spearmanRhoLabel = new SpearmanRho(xyVals.x, xyVals.y)
    spearmanRhoLabel.calc().then(rho => {
      correlationsByLabel[label] = rho

      console.log('correlationsByLabel', correlationsByLabel)
    })
  })
}
