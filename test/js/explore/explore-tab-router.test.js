import * as Reach from '@reach/router'

import useExploreTabRouter from 'components/explore/ExploreTabRouter'

describe('dataParams are appropriately managed on the url', () => {
  it('provides empty cluster params from a blank url', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')
    routerNav.mockImplementation(() => {})
    const locationMock = jest.spyOn(Reach, 'useLocation')
    locationMock.mockImplementation(() => ({ search: '' }))

    const { exploreParams, updateExploreParams } = useExploreTabRouter()
    expect(exploreParams.cluster).toEqual('')
    expect(exploreParams.annotation).toEqual({ name: '', type: '', scope: '' })

    updateExploreParams({ cluster: 'foo' })
    expect(routerNav).toHaveBeenLastCalledWith('?cluster=foo#study-visualize', { replace: true })
  })

  it('provides cluster params from a url with a cluster', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')
    routerNav.mockImplementation(() => {})
    const locationMock = jest.spyOn(Reach, 'useLocation')
    locationMock.mockImplementation(() => ({ search: '?cluster=foo&annotation=bar--group--study' }))

    const { exploreParams, updateExploreParams } = useExploreTabRouter()
    expect(exploreParams.cluster).toEqual('foo')
    expect(exploreParams.annotation).toEqual({ name: 'bar', type: 'group', scope: 'study' })

    updateExploreParams({ annotation: { name: 'bar2', type: 'numeric', scope: 'user' } })
    expect(routerNav).toHaveBeenLastCalledWith('?cluster=foo&annotation=bar2--numeric--user#study-visualize', { replace: true })
  })

  /** This test validates that we are parsing data params on URL links in a consistent way
    * Note that if this test breaks, it may indicate that we have changed the parameter names or how
    * we are parsing them, which may break links that our users have previously created
    * So update with care */
  it('allows specifying and updating all exploreParams', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')
    routerNav.mockImplementation(() => {})
    const locationMock = jest.spyOn(Reach, 'useLocation')
    let urlString = '?geneList=My%20List&genes=agpat2,apoe&cluster=foo&annotation=bar--group--study&subsample=1000'
    urlString += '&spatialGroups=square,circle&consensus=mean&heatmapRowCentering=z-score&bamFileName=sample1.bam'
    urlString += '&ideogramFileId=604fc5c4e241391a8ff93271'
    locationMock.mockImplementation(() => ({ search: urlString }))

    const { exploreParams, updateExploreParams } = useExploreTabRouter()
    expect(exploreParams).toEqual({
      cluster: 'foo',
      genes: ['agpat2', 'apoe'],
      geneList: 'My List',
      bamFileName: 'sample1.bam',
      annotation: { name: 'bar', type: 'group', scope: 'study' },
      subsample: '1000',
      spatialGroups: ['square', 'circle'],
      consensus: 'mean',
      heatmapRowCentering: 'z-score',
      ideogramFileId: '604fc5c4e241391a8ff93271',
      distributionPlot: '',
      distributionPoints: '',
      heatmapFit: '',
      scatterColor: '',
      tab: '',
      userSpecified: {
        annotation: true,
        bamFileName: true,
        cluster: true,
        consensus: true,
        genes: true,
        geneList: true,
        spatialGroups: true,
        subsample: true,
        heatmapRowCentering: true,
        ideogramFileId: true
      }
    })

    updateExploreParams({ spatialGroups: ['triangle'] })
    let expectedUrlString = '?geneList=My%20List&genes=agpat2%2Capoe&cluster=foo&spatialGroups=triangle&annotation=bar--group--study&subsample=1000'
    expectedUrlString += '&consensus=mean&heatmapRowCentering=z-score&bamFileName=sample1.bam&ideogramFileId=604fc5c4e241391a8ff93271#study-visualize'
    expect(routerNav).toHaveBeenLastCalledWith(expectedUrlString, { replace: true })
  })
})
