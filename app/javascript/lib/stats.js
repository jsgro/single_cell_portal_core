import SpearmanRho from 'spearman-rho'

window.spearman = SpearmanRho

/** Get map of scatter plot coordinates by annotation label */
function getValuesByLabel(scatter) {
  const valuesByLabel = {}

  const { annotations, x, y } = scatter.data
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
  const correlations = { byLabel: {} }
  const spearmanRho = new SpearmanRho(scatter.data.x, scatter.data.y)

  const value = await spearmanRho.calc()
  correlations.bulk = value

  // Compute per-label correlations
  const valuesByLabel = getValuesByLabel(scatter)

  await Promise.all(
    Object.entries(valuesByLabel).map(async ([label, xyVals]) => {
      const spearmanRhoLabel = new SpearmanRho(xyVals.x, xyVals.y)
      const rho = await spearmanRhoLabel.calc()
      correlations.byLabel[label] = rho
    })
  )

  return correlations
}

/**
 * Format number in bytes, with human-friendly units
 *
 * Derived from https://gist.github.com/lanqy/5193417#gistcomment-2663632
 */
export function bytesToSize(bytes) {
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) {
    return 'n/a'
  }
  if (!bytes) {
    return undefined
  }

  // eweitz: Most implementations use log(1024), but such units are
  // binary and have values like MiB (mebibyte)
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10)

  if (i === 0) {return `${bytes} ${sizes[i]}`}
  return `${(bytes / (1000 ** i)).toFixed(1)} ${sizes[i]}`
}
