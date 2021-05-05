// Without disabling eslint code, Promises are auto inserted
/* eslint-disable */

import {mockPerformance} from './mock-performance'

import {calculatePerfTimes} from 'lib/metrics-perf'

describe('Helper library for client-side usage analytics', () => {

  it('calculates perfTime values correctly', () => {

    const mockPerfTimes = {
      url: 'https://localhost:3000/single_cell/api/v1/studies/SCP42/clusters/_default?',
      legacy: 1968.8150000353344,
      parse: 30,
      plotStart: 3000,
    }

    mockPerformance(mockPerfTimes.url)

    const perfTimes = calculatePerfTimes(mockPerfTimes)

    expect(perfTimes['perfTime:data:compression-ratio']).toEqual(4.21)

    const oldPerfTime = perfTimes['perfTime']
    expect(oldPerfTime).toEqual(1969)

    // perfTime:backend should *exclude* network time for request and response;
    // legacy perfTime included these aspects of frontend (i.e. client) time.
    expect(oldPerfTime).toBeGreaterThan(perfTimes['perfTime:backend'])
  })

})
