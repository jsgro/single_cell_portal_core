import { newCache } from 'components/explore/plotDataCache'
import _clone from 'lodash/clone'

describe('Plot data caching', () => {
  it('returns a new cache that can store data', async () => {
    const cache = newCache()
    const accession = 'SCP101'
    expect(cache.hasScatterData(accession, 'foo')).toEqual(false)

    cache.addScatterData(accession, 'foo', { x: [1], y: [2], cells: ['A'] })
    expect(cache.hasScatterData(accession, 'foo')).toEqual(true)
    expect(cache.hasScatterData(accession, 'bar')).toEqual(false)
    expect(cache.hasScatterData('SCPXXX', 'foo')).toEqual(false)

    expect(cache.getScatterData(accession, 'foo').x).toEqual([1])
  })

  it('merges response data appropriately', async () => {
    const cache = newCache()
    const accession = 'SCP101'
    const response = {
      cluster: 'foo',
      data: {
        x: [0, 2, 3],
        y: [1, 3, 5],
        cells: ['A', 'B', 'C'],
        stuff: 'dfasdf'
      }
    }
    const cloneResponse = _clone(response)
    cache.applyCache(accession, response)
    expect(cache.hasScatterData(accession, 'foo')).toEqual(true)
    expect(response).toEqual(cloneResponse)

    const response2 = {
      cluster: 'foo',
      data: {
        expression: [0, 0, 0.5]
      }
    }

    cache.applyCache(accession, response2)
    expect(response2.data.x).toEqual(response.data.x)
    expect(response2.data.y).toEqual(response.data.y)
    expect(response2.data.cells).toEqual(response.data.cells)
    // other properties should not be copied
    expect(response2.data.stuff).toEqual(undefined)

    // the cache should not have been changed
    expect(cache.getScatterData(accession, 'foo').x).toEqual([0,2,3])
  })
})
