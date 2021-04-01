import * as Reach from '@reach/router'
import React from 'react'
import { mount } from 'enzyme'

import { getNewContextMap } from 'components/explore/ScatterTab'

describe('getNewContextMap correctly assigns contexts', () => {
  it('assigns correctly on first pass', async () => {
    const scatterParams = [{
      cluster: 'clusterA',
      annotation: { name: 'annotA' },
      genes: ['gene1']
    }, {
      cluster: 'clusterA',
      annotation: { name: 'annotA' },
      genes: []
    }]
    const newMap = getNewContextMap(scatterParams, {})
    expect(newMap).toEqual({
      'clusterAgene1annotA': 'A',
      'clusterAannotA': 'B'
    })
  })

  it('preserves the cluster context when adding a gene expression plot', async () => {
    const scatterParams = [{
      cluster: 'clusterA',
      annotation: { name: 'annotA' },
      genes: ['gene1']
    }, {
      cluster: 'clusterA',
      annotation: { name: 'annotA' },
      genes: []
    }]
    const newMap = getNewContextMap(scatterParams, {'clusterAannotA': 'A'})
    expect(newMap).toEqual({
      'clusterAgene1annotA': 'B',
      'clusterAannotA': 'A'
    })
  })

  it('preserves the cluster context when removing a gene expression plot', async () => {
    const scatterParams = [{
      cluster: 'clusterA',
      annotation: { name: 'annotA' },
      genes: []
    }]
    const newMap = getNewContextMap(scatterParams, {
      'clusterAgene1annotA': 'A',
      'clusterAannotA': 'B'
    })
    expect(newMap).toEqual({
      'clusterAannotA': 'B'
    })
  })
})
