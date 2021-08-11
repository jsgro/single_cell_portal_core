import SpearmanRho from 'spearman-rho'

window.spearman = SpearmanRho

/** Get map of scatter plot coordinates by annotation label */
function getValuesByLabel(scatter) {
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

/** Compute Spearman correlations, then push state upstream */
export async function computeCorrelations(scatter) {
  const correlations = {}
  // compute correlation stats asynchronously so it doesn't delay
  // rendering of other visualizations or impact logging
  // in the event these stats become more complex or widely used, consider instrumentation strategies
  const spearmanRho = new SpearmanRho(scatter.data.x, scatter.data.y)

  const value = await spearmanRho.calc()
  correlations.all = value

  // Compute per-label correlations
  const valuesByLabel = getValuesByLabel(scatter)

  await Promise.all(
    Object.entries(valuesByLabel).map(async ([label, xyVals]) => {
      const spearmanRhoLabel = new SpearmanRho(xyVals.x, xyVals.y)
      const rho = await spearmanRhoLabel.calc()
      correlations[label] = rho
    })
  )

  return correlations
}
