/**
 * @fileoverview Functions to log web vitals to Bard / Mixpanel
 */

import { getTTFB, getFCP, getLCP, getFID, getCLS } from 'web-vitals'

import { log } from './metrics-api'

/** Client device memory, # CPUs, and Internet connection speed. */
export const hardwareStats = getHardwareStats()

/**
 * Get data on client device memory, # CPUs, and Internet connection speed.
 *
 * - Effective connection type: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 * - Device memory: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
 *
 * Adapted from:
 * https://github.com/treosh/web-vitals-reporter/blob/72a807e1df5749896668665d1d28867902ae909d/src/index.js
 */
function getHardwareStats() {
  const nav = (typeof navigator === 'undefined' ? null : navigator)
  const stats = {
    'hardware:memory': nav ? nav.deviceMemory : undefined,
    'hardware:cpus': nav ? nav.hardwareConcurrency : undefined
  }

  const conn = nav && nav.connection ? nav.connection : null
  if (conn) {
    stats['hardware:connection-type'] = conn.effectiveType
    stats['hardware:connection-rtt'] = conn.rtt
    stats['hardware:connection-downlink'] = conn.downlink
  }

  return stats
}

/**
 * Round, source: https://stackoverflow.com/a/18358056
 *
 * @param {number} val
 * @param {number} [precision]
 * @return {number}
 */
function round(val, precision = 0) {
  // @ts-ignore
  return +(`${Math.round(`${val}e+${precision}`)}e-${precision}`)
}

/**
 * Create Web Vitals Bard reporter, that accepts `Metric` values and sends it
 * to Bard using `navigator.sendBeacon`.
 *
 * The function is called only once per page load.
 *
 * This is adapted from:
 * https://github.com/treosh/web-vitals-reporter/blob/72a807e1df5749896668665d1d28867902ae909d/src/index.js
 *
 * @return {(metric: Metric) => void}
 */
export function createWebVitalsBardReporter() {
  let isSent = false
  let isCalled = false
  let result = {}

  const sendValues = () => {
    if (isSent) {return} // data is already sent
    if (!isCalled) {return} // no data collected

    result.duration = performance.now()

    result = Object.assign(result, hardwareStats)

    isSent = true

    if (typeof navigator === 'undefined') {return}
    return log('web-vitals', result, true)
  }


  const mapMetric = function(metric) {
    const isWebVital = ['FCP', 'TTFB', 'LCP', 'CLS', 'FID'].indexOf(metric.name) !== -1
    return { [metric.name]: isWebVital ? round(metric.value, metric.name === 'CLS' ? 4 : 0) : metric.value }
  }

  /** @param {Metric} metric */
  const report = metric => {
    if (!isCalled) {isCalled = true}
    result = { ...result, ...mapMetric(metric, result) }
  }

  // should be the last call to capture latest CLS
  setTimeout(() => {
    // Safari does not fire "visibilitychange" on the tab close
    // So we have 2 options: lose Safari data, or loose LCP/CLS that depends on "visibilitychange" logic.
    // Current solution: if LCP/CLS supported, use `onHidden` otherwise, use `pagehide` to fire the callback in the end.
    //
    // More details: https://github.com/treosh/web-vitals-reporter/issues/3
    const supportedEntryTypes =
      (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes) || []
    const isLatestVisibilityChangeSupported = supportedEntryTypes.indexOf('layout-shift') !== -1

    if (isLatestVisibilityChangeSupported) {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          sendValues()
          removeEventListener('visibilitychange', onVisibilityChange, true)
        }
      }
      addEventListener('visibilitychange', onVisibilityChange, true)
    } else {
      addEventListener('pagehide', sendValues, { capture: true, once: true })
    }
  })

  return report
}

/**
 * Logs web vitals, performance metrics for page view UX, to Bard / Mixpanel
 *
 * Includes:
 *  - TTFB: time to first byte, a very early page load event
 *  - FCP: first contentful paint, when users gets first visual feedback
 *  - LCP: largest contentful paint, a middle measure perceived load time
 *  - FID: first input delay, when user can first interact (e.g. click)
 *  - CLS: cumulative layout shift, measures visual stability
 *  - Hardware stats on connection speed, # CPUs, memory
 *
 * LCP, FID, and CLS are the core web vitals.
 * TTFB and FCP are useful supplements.
 */
export function logWebVitals() {
  const logWebVitalToBard = createWebVitalsBardReporter()

  getTTFB(logWebVitalToBard)
  getFCP(logWebVitalToBard)
  getLCP(logWebVitalToBard)
  getFID(logWebVitalToBard)
  getCLS(logWebVitalToBard)
}
