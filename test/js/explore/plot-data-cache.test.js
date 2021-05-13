import * as ScpApi from 'lib/scp-api'

import _cloneDeep from 'lodash/cloneDeep'
import { newCache } from 'components/explore/plotDataCache'

// models a real response from api/v1/visualization/clusters
const FETCH_CLUSTER_RESPONSE = {
    "data": {
        "annotations": ["foo", "bar"],
        "cells": ['A', 'B'],
        "x": [11, 14],
        "y": [0, 1],
    },
    "pointSize": 3,
    "clusterSpecifiedRanges": null,
    "showClusterPointBorders": false,
    "description": null,
    "is3D": false,
    "isSubsampled": false,
    "isAnnotatedScatter": false,
    "numPoints": 130,
    "axes": {
        "titles": {
            "x": "X",
            "y": "Y",
            "z": "Z"
        },
        "aspects": null
    },
    "hasCoordinateLabels": false,
    "coordinateLabels": [],
    "defaultPointOpacity": 1,
    "cluster": "cluster.tsv",
    "genes": [],
    "annotParams": {
        "name": "buzzwords",
        "type": "group",
        "scope": "study",
        "values": ['foo', 'bar'],
        "identifier": "biosample_id--group--study"
    },
    "subsample": "all",
    "consensus": null
}


const ANNOTATION_ONLY_RESPONSE = _cloneDeep(FETCH_CLUSTER_RESPONSE)
ANNOTATION_ONLY_RESPONSE.annotParams = {
    "name": "species",
    "type": "group",
    "scope": "study",
    "values": ['dog', 'cat'],
    "identifier": "species--group--study"
  }
ANNOTATION_ONLY_RESPONSE.data = {
  "annotations": ["cat", "dog"]
}


describe('cache caches basic cluster data', () => {
  it('caches a single cluster call', async () => {
    const cache = newCache()
    const apiFetch = jest.spyOn(ScpApi, 'fetchCluster')
    // pass in a clone of the response since it may get modified by the cache operations
    apiFetch.mockImplementation(() => Promise.resolve([_cloneDeep(FETCH_CLUSTER_RESPONSE), 500]))
    const result = cache.fetchCluster({
      studyAccession: 'SCP1',
      cluster: '_default',
      annotation: {}
    })
    const expectedApiParams = {
      "annotation": {},
      "cluster": "_default",
      "consensus": undefined,
      "fields": ["coordinates", "cells", "annotation"],
      "genes": [],
      "isAnnotatedScatter": false,
      "studyAccession": "SCP1",
      "subsample": undefined
    }
    // first check that the repsonse is fetched and returned normally if not in cache
    expect(apiFetch).toHaveBeenLastCalledWith(expectedApiParams)
    return result.then(response => {
      expect(response).toEqual([FETCH_CLUSTER_RESPONSE, 500])
      return response
    }).then(() => {
      // now check that it only fetches the needed fields when changing annotation
      apiFetch.mockImplementation(() => Promise.resolve([_cloneDeep(ANNOTATION_ONLY_RESPONSE), 500]))
      const secondFetch = cache.fetchCluster({
        studyAccession: 'SCP1',
        cluster: '_default',
        annotation: {
          name: 'species',
          scope: 'study'
        }
      })
      const expectedApiParams2 = {
        "annotation": {name: 'species', scope: 'study'},
        "cluster": "_default",
        "consensus": undefined,
        "fields": ["annotation"],
        "genes": [],
        "isAnnotatedScatter": false,
        "studyAccession": "SCP1",
        "subsample": undefined
      }
      expect(apiFetch).toHaveBeenLastCalledWith(expectedApiParams2)
      return secondFetch
    }).then((response) => {
      // confirm the fields got merged
      const scatterData = response[0].data
      console.log(ANNOTATION_ONLY_RESPONSE)
      expect(scatterData.x).toEqual(FETCH_CLUSTER_RESPONSE.data.x)
      expect(scatterData.y).toEqual(FETCH_CLUSTER_RESPONSE.data.y)
      expect(scatterData.cells).toEqual(FETCH_CLUSTER_RESPONSE.data.cells)
      expect(scatterData.annotations).toEqual(ANNOTATION_ONLY_RESPONSE.data.annotations)
      expect(response[0].annotParams.name).toEqual('species')
      return response
    })
  })
})


