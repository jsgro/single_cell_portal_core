import * as Reach from '@reach/router'

import useExploreTabRouter from 'components/explore/ExploreTabRouter'

describe('dataParams are appropriately managed on the url', () => {
  it('provides empty cluster params from a blank url', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')
    routerNav.mockImplementation(() => {})
    const locationMock = jest.spyOn(Reach, 'useLocation')
    locationMock.mockImplementation(() => ({ search: '' }))

    const { dataParams, updateDataParams } = useExploreTabRouter()
    expect(dataParams.cluster).toEqual('')
    expect(dataParams.annotation).toEqual({ name: '', type: '', scope: '' })

    updateDataParams({ cluster: 'foo' })
    expect(routerNav).toHaveBeenLastCalledWith('?cluster=foo#study-visualize', { replace: true })
  })

  it('provides cluster params from a url with a cluster', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')
    routerNav.mockImplementation(() => {})
    const locationMock = jest.spyOn(Reach, 'useLocation')
    locationMock.mockImplementation(() => ({ search: '?cluster=foo&annotation=bar--group--study' }))

    const { dataParams, updateDataParams } = useExploreTabRouter()
    expect(dataParams.cluster).toEqual('foo')
    expect(dataParams.annotation).toEqual({ name: 'bar', type: 'group', scope: 'study' })

    updateDataParams({ annotation: { name: 'bar2', type: 'numeric', scope: 'user' } })
    expect(routerNav).toHaveBeenLastCalledWith('?cluster=foo&annotation=bar2--numeric--user#study-visualize', { replace: true })
  })

  /** This test validates that we are parsing data params on URL links in a certain way
    * This is IMPORTANT to make sure that we maintain URL consistency over time.
    * e.g. if a user shares a ink to a certain cluster visualization, we want to be SURE
    * that link stays stable.
    * So before making any updates to this test, please consult Devon and/or Vicky about the possible implications
    * of changing url parameters for our visualization */
  it('allows specifying and updating all dataParams', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')
    routerNav.mockImplementation(() => {})
    const locationMock = jest.spyOn(Reach, 'useLocation')
    let urlString = '?genes=agpat2,apoe&cluster=foo&annotation=bar--group--study&subsample=1000'
    urlString += '&spatialGroups=square,circle&consensus=mean&heatmapRowCentering=z-score'
    locationMock.mockImplementation(() => ({ search: urlString }))

    const { dataParams, updateDataParams } = useExploreTabRouter()
    expect(dataParams).toEqual({
      cluster: 'foo',
      genes: ['agpat2', 'apoe'],
      annotation: { name: 'bar', type: 'group', scope: 'study' },
      subsample: '1000',
      spatialGroups: ['square', 'circle'],
      consensus: 'mean',
      heatmapRowCentering: 'z-score',
      userSpecified: {
        annotation: true,
        cluster: true,
        consensus: true,
        genes: true,
        spatialGroups: true,
        subsample: true,
        heatmapRowCentering: true
      }
    })

    updateDataParams({ spatialGroups: ['triangle'] })
    let expectedUrlString = '?genes=agpat2%2Capoe&cluster=foo&spatialGroups=triangle&annotation=bar--group--study&subsample=1000'
    expectedUrlString += '&consensus=mean&heatmapRowCentering=z-score#study-visualize'
    expect(routerNav).toHaveBeenLastCalledWith(expectedUrlString, { replace: true })
  })
})
