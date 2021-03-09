import { getEnabledTabs } from 'components/explore/ExploreDisplayTabs'

describe("explore tabs are activated based on variables", () => {
    it('should enable tabs based on exploreInfo and exploreParams', async () => {
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
            geneLists: ['Gene List 1', 'Gene List 2'],
            annotationList: [],
            clusterGroupNames: ['foo', 'bar'],
            spatialGroupNames: ['bing', 'baz'],
            spatialGroups: [
                {'name': 'bing', 'associated_clusters': ['foo']},
                {'name': 'baz', 'associated_clusters': ['bar']}
            ],
            clusterPointAlpha: 1.0
        }

        // Construct multiple mock parameter objects and the expected results from getEnabledTabs
        // this is used to through each pair of params/results and asserts returns
        // while this looks weird it reduces the amount of repeated assertions
        const testParamsAndResults = [
            [
                {
                    cluster: 'foo', // request params loading only a cluster
                    annotation: { name: 'bar', type: 'group', scope: 'study' },
                    userSpecified: {
                        annotation: true,
                        cluster: true
                    }
                }, {
                enabledTabs: ['cluster'],
                isGeneList: false,
                isGene: false,
                isMultiGene: false
            }
            ],
            [
                {
                    cluster: 'foo', // request params loading a cluster and one gene
                    genes: ['agpat2'],
                    annotation: { name: 'bar', type: 'group', scope: 'study' },
                    userSpecified: {
                        annotation: true,
                        cluster: true,
                        genes: true
                    }
                }, {
                enabledTabs: ['dotplot', 'heatmap'],
                isGeneList: false,
                isGene: false,
                isMultiGene: false
            }
            ],
            [
                {
                    cluster: 'foo', // request params for cluster and spatial w/ one gene
                    genes: ['agpat2'],
                    annotation: {name: 'bar', type: 'group', scope: 'study'},
                    spatialGroups: ['square', 'circle'],
                    userSpecified: {
                        annotation: true,
                        cluster: true,
                        genes: true,
                        spatialGroups: true
                    }
                }, {
                enabledTabs: ['scatter', 'distribution'],
                isGeneList: false,
                isGene: true,
                isMultiGene: false
            }
            ],
            [
                {
                    cluster: 'foo', // request params loading a cluster and multiple genes
                    genes: ['agpat2', 'apoe'],
                    annotation: { name: 'bar', type: 'group', scope: 'study' },
                    userSpecified: {
                        annotation: true,
                        bamFileName: true,
                        cluster: true,
                        genes: true,
                        geneList: true,
                        spatialGroups: true
                    }
                }, {
                enabledTabs: ['spatial', 'dotplot', 'heatmap'],
                isGeneList: false,
                isGene: true,
                isMultiGene: true
            }
            ],
            [
                {
                    cluster: 'foo',  // request params loading a cluster and multiple genes w/ consensus
                    genes: ['agpat2', 'apoe'],
                    annotation: { name: 'bar', type: 'group', scope: 'study' },
                    consensus: 'mean',
                    userSpecified: {
                        annotation: true,
                        cluster: true,
                        genes: true,
                        consensus: true
                    }
                }, {
                enabledTabs: ['scatter', 'distribution', 'dotplot'],
                isGeneList: false,
                isGene: true,
                isMultiGene: true
            }
            ],
            [
                {
                    bamFileName: 'sample1.bam', // request params for bam file only
                    userSpecified: {
                        bamFileName: true
                    }
                }, {
                enabledTabs: ['genome'],
                isGeneList: false,
                isGene: false,
                isMultiGene: false
            }
            ],
            [
                {
                    geneList: 'Gene List 1', // request params for gene list only
                    userSpecified: {
                        geneList: true
                    }
                }, {
                enabledTabs: ['heatmap'],
                isGeneList: true,
                isGene: false,
                isMultiGene: false
            }
            ]
        ]

        for ( var [exploreParams, expectedResults] of testParamsAndResults) {
            let {enabledTabs, isGeneList, isGene, isMultiGene} = getEnabledTabs(exploreInfo, exploreParams)
            expect(enabledTabs).toEqual(expectedResults.enabledTabs)
            expect(isGeneList).toEqual(expectedResults.isGeneList)
            expect(isGene).toEqual(expectedResults.isGene)
            expect(isMultiGene).toEqual(expectedResults.isMultiGene)
        }
    })
})
