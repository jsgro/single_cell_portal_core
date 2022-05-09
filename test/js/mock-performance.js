let { performance } = require('perf_hooks')
const nodePerformance = performance

/**
 * Mock Performance object, to test code that relies on it
 *
 * @param {String} url URL to use for mock PerformanceEntry object
 */
export function mockPerformance(url) {
  // Mock PerformanceEntry object, copied from real local example then
  // modified values for easier reasoning.
  const mockPerfEntry = {
    connectEnd: 1000.519999971613,
    connectStart: 1000.519999971613,
    decodedBodySize: 379216,
    domainLookupEnd: 1000.519999971613,
    domainLookupStart: 1000.519999971613,
    duration: 1962.8150000353344,
    encodedBodySize: 90138,
    entryType: 'resource',
    fetchStart: 1000.519999971613,
    initiatorType: 'fetch',
    name: url, // Same URL as that in mockPerfTimes
    nextHopProtocol: 'http/1.1',
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 1002.420000003651,
    responseEnd: 2963.335000006948,
    responseStart: 2960.079999960028,
    secureConnectionStart: 1000.519999971613,
    serverTiming: [],
    startTime: 1000.519999971613,
    transferSize: 90983,
    workerStart: 0,
    workerTiming: []
  }

  const mockEntries = [
    { name: 'decoy1' },
    mockPerfEntry,
    { name: 'decoy2' },
    { name: 'decoy3' }
  ]

  // Mock parts of the Performance API used in calculatePerfTimes
  performance = {
    getEntriesByType: jest.fn().mockReturnValue(mockEntries),
    now: nodePerformance.now,
    mark: () => {}
  }

  Object.defineProperty(window, 'performance', {
    configurable: true,
    enumerable: true,
    value: performance,
    writable: true
  })
}
