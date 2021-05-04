// Without disabling eslint code, Promises are auto inserted
/* eslint-disable */

let {performance} = require('perf_hooks')
const nodePerformance = performance

import {calculatePerfTimes} from 'lib/scp-api-metrics'

describe('Helper library for client-side usage analytics', () => {

  it('calculates perfTime values correctly', () => {

    const url = "https://localhost:3000/single_cell/api/v1/studies/SCP42/clusters/_default?"

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
      entryType: "resource",
      fetchStart: 1000.519999971613,
      initiatorType: "fetch",
      name: url, // Same URL as that in mockPerfTimes
      nextHopProtocol: "http/1.1",
      redirectEnd: 0,
      redirectStart: 0,
      requestStart: 1002.420000003651,
      responseEnd:  2963.335000006948,
      responseStart: 2960.079999960028,
      secureConnectionStart: 1000.519999971613,
      serverTiming: [],
      startTime: 1000.519999971613,
      transferSize: 90983,
      workerStart: 0,
      workerTiming: []
    }

    const mockEntries = [
      {name: 'decoy1'},
      mockPerfEntry,
      {name: 'decoy2'},
      {name: 'decoy3'}
    ]

    // Mock parts of the Performance API used in calculatePerfTimes
    performance = {
      getEntriesByType: jest.fn().mockReturnValue(mockEntries),
      now: nodePerformance.now
    }

    Object.defineProperty(window, 'performance', {
      configurable: true,
      enumerable: true,
      value: performance,
      writable: true,
    })

    const mockPerfTimes = {
      url: 'https://localhost:3000/single_cell/api/v1/studies/SCP42/clusters/_default?',
      legacy: 1968.8150000353344,
      parse: 30,
      plotStart: 3000,
    }

    const perfTimes = calculatePerfTimes(mockPerfTimes)

    expect(perfTimes['perfTime:data:compression-ratio']).toEqual(4.21)

    const oldPerfTime = perfTimes['perfTime']
    expect(oldPerfTime).toEqual(1969)

    // perfTime:backend should *exclude* network time for request and response;
    // legacy perfTime included these aspects of frontend (i.e. client) time.
    expect(oldPerfTime).toBeGreaterThan(perfTimes['perfTime:backend'])
  })

})
