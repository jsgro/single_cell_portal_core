// mock various modules from genome tab as these aren't being used, and throw compilation errors from jest
jest.mock('components/explore/GenomeView', () => {
  return {
    igv: jest.fn(() => mockPromise)
  }
})

jest.mock('components/visualization/RelatedGenesIdeogram', () => {
  return {
    Ideogram: jest.fn(() => mockPromise)
  }
})

import { getEnabledTabs } from 'components/explore/ExploreDisplayTabs'

describe("explore tabs are activated based on study info and parameters", () => {
  it('should enable cluster tab', async () => {
    // mock exploreInfo from study
    const exploreInfo = {
      cluster: 'foo',
      taxonNames: ['Homo sapiens'],
      inferCNVIdeogramFiles: [],
      bamBundleList: [],
      uniqueGenes: ['Agpat2', 'Apoe', 'Gad1', 'Gad2'],
      geneLists: [],
      annotationList: [],
      clusterGroupNames: ['foo', 'bar'],
      spatialGroupNames: [],
      spatialGroups: [],
      clusterPointAlpha: 1.0
    }

    const exploreParams = {
      cluster: 'foo', // request params loading only a cluster
      annotation: { name: 'bar', type: 'group', scope: 'study' },
      userSpecified: {
        annotation: true,
        cluster: true
      }
    }
    const expectedResults = {
      enabledTabs: ['cluster'],
      isGeneList: false,
      isGene: false,
      isMultiGene: false
    }

    expect(expectedResults).toEqual(getEnabledTabs(exploreInfo, exploreParams))
  })

  it('should enable cluster and genome tab', async () => {
    // mock exploreInfo from study
    const exploreInfo = {
      cluster: 'foo',
      taxonNames: ['Homo sapiens'],
      inferCNVIdeogramFiles: [],
      bamBundleList: [
        {"name": "sample1.bam", "file_type": "BAM"},
        {"name": "sample1.bam.bai", "file_type": "BAM Index"}
      ],
      uniqueGenes: ['Agpat2', 'Apoe', 'Gad1', 'Gad2'],
      geneLists: [],
      annotationList: [],
      clusterGroupNames: ['foo', 'bar'],
      spatialGroupNames: [],
      spatialGroups: [],
      clusterPointAlpha: 1.0
    }

    const exploreParams = {
      cluster: 'foo',
      annotation: { name: 'bar', type: 'group', scope: 'study' },
      bamFileName: 'sample1.bam',
      userSpecified: {
        annotation: true,
        cluster: true,
        bamFileName: true
      }
    }
    const expectedResults = {
      enabledTabs: ['cluster', 'genome'],
      isGeneList: false,
      isGene: false,
      isMultiGene: false
    }

    expect(expectedResults).toEqual(getEnabledTabs(exploreInfo, exploreParams))
  })

  it('should enable heatmap tab for gene lists', async () => {
    // mock exploreInfo from study
    const exploreInfo = {
      cluster: 'foo',
      taxonNames: ['Homo sapiens'],
      inferCNVIdeogramFiles: [],
      bamBundleList: [],
      uniqueGenes: ['Agpat2', 'Apoe', 'Gad1', 'Gad2'],
      geneLists: ['Gene List 1', 'Gene List 2'],
      annotationList: [],
      clusterGroupNames: ['foo', 'bar'],
      spatialGroupNames: [],
      spatialGroups: [],
      clusterPointAlpha: 1.0
    }

    const exploreParams = {
      geneList: 'Gene List 1',
      userSpecified: {
        geneList: true
      }
    }
    const expectedResults = {
      enabledTabs: ['heatmap'],
      isGeneList: true,
      isGene: false,
      isMultiGene: false
    }

    expect(expectedResults).toEqual(getEnabledTabs(exploreInfo, exploreParams))
  })

  it ('should enable scatter/distribution tabs when searching one gene', async () => {
    const exploreInfo = {
      cluster: 'foo',
      taxonNames: ['Homo sapiens'],
      inferCNVIdeogramFiles: [],
      bamBundleList: [],
      uniqueGenes: ['Agpat2', 'Apoe', 'Gad1', 'Gad2'],
      geneLists: [],
      annotationList: [],
      clusterGroupNames: ['foo', 'bar'],
      spatialGroupNames: [],
      spatialGroups: [],
      clusterPointAlpha: 1.0
    }

    const exploreParams = {
      cluster: 'foo',
      genes: ['Agpat2'],
      annotation: {name: 'bar', type: 'group', scope: 'study'},
      userSpecified: {
        annotation: true,
        cluster: true,
        genes: true
      }
    }

    const expectedResults = {
      enabledTabs: ['scatter', 'distribution'],
      isGeneList: false,
      isGene: true,
      isMultiGene: false
    }

    expect(expectedResults).toEqual(getEnabledTabs(exploreInfo, exploreParams))
  })

  it ('should enable dotplot/heatmap tabs when searching multiple genes', async () => {
    const exploreInfo = {
      cluster: 'foo',
      taxonNames: ['Homo sapiens'],
      inferCNVIdeogramFiles: [],
      bamBundleList: [],
      uniqueGenes: ['Agpat2', 'Apoe', 'Gad1', 'Gad2'],
      geneLists: [],
      annotationList: [],
      clusterGroupNames: ['foo', 'bar'],
      spatialGroupNames: [],
      spatialGroups: [],
      clusterPointAlpha: 1.0
    }

    const exploreParams = {
      cluster: 'foo',
      genes: ['Agpat2', 'Apoe'],
      annotation: {name: 'bar', type: 'group', scope: 'study'},
      userSpecified: {
        annotation: true,
        cluster: true,
        genes: true
      }
    }

    const expectedResults = {
      enabledTabs: ['dotplot', 'heatmap'],
      isGeneList: false,
      isGene: true,
      isMultiGene: true
    }

    expect(expectedResults).toEqual(getEnabledTabs(exploreInfo, exploreParams))
  })

  it ('should enable spatial/dotplot/heatmap tabs when searching multiple genes', async () => {
    const exploreInfo = {
      cluster: 'foo',
      taxonNames: ['Homo sapiens'],
      inferCNVIdeogramFiles: [],
      bamBundleList: [],
      uniqueGenes: ['Agpat2', 'Apoe', 'Gad1', 'Gad2'],
      geneLists: [],
      annotationList: [],
      clusterGroupNames: ['foo', 'bar'],
      spatialGroupNames: ['bing', 'baz'],
      spatialGroups: [
        {'name': 'bing', 'associated_clusters': ['foo']},
        {'name': 'baz', 'associated_clusters': ['bar']}
      ],
      clusterPointAlpha: 1.0
    }

    const exploreParams = {
      cluster: 'foo',
      genes: ['Agpat2', 'Apoe'],
      annotation: { name: 'bar', type: 'group', scope: 'study' },
      spatialGroups: ['square', 'circle'],
      userSpecified: {
        annotation: true,
        cluster: true,
        genes: true,
        spatialGroups: true
      }
    }

    const expectedResults = {
      enabledTabs: ['spatial', 'dotplot', 'heatmap'],
      isGeneList: false,
      isGene: true,
      isMultiGene: true
    }

    expect(expectedResults).toEqual(getEnabledTabs(exploreInfo, exploreParams))
  })

  it ('should enable scatter/distribution/dotplot tabs when searching multiple genes w/ consensus', async () => {
    const exploreInfo = {
      cluster: 'foo',
      taxonNames: ['Homo sapiens'],
      inferCNVIdeogramFiles: [],
      bamBundleList: [],
      uniqueGenes: ['Agpat2', 'Apoe', 'Gad1', 'Gad2'],
      geneLists: [],
      annotationList: [],
      clusterGroupNames: ['foo', 'bar'],
      spatialGroupNames: [],
      spatialGroups: [],
      clusterPointAlpha: 1.0
    }

    const exploreParams = {
      cluster: 'foo',
      genes: ['Agpat2', 'Apoe'],
      annotation: { name: 'bar', type: 'group', scope: 'study' },
      consensus: 'mean',
      userSpecified: {
        annotation: true,
        cluster: true,
        genes: true,
        consensus: true
      }
    }

    const expectedResults = {
      enabledTabs: ['scatter', 'distribution', 'dotplot'],
      isGeneList: false,
      isGene: true,
      isMultiGene: true
    }

    expect(expectedResults).toEqual(getEnabledTabs(exploreInfo, exploreParams))
  })
})
