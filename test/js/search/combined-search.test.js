import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import * as Reach from '@reach/router'

import FacetControl from 'components/search/controls/FacetControl'
import KeywordSearch from 'components/search/controls/KeywordSearch'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'

import { logSelectSearchResult } from 'components/search/results/StudySearchResult'
import * as MetricsApi from '~/lib/metrics-api'


const fs = require('fs')
const mockStudyPath = 'public/mock_data/search/select_search_results/blood_study.json'
const bloodStudy = JSON.parse(fs.readFileSync(mockStudyPath), 'utf8')
const mockLogPropsPath =
  'public/mock_data/search/select_search_results/blood_log_props.json'
const bloodLogProps = JSON.parse(fs.readFileSync(mockLogPropsPath), 'utf8')


const speciesFacet = {
  name: 'Species',
  id: 'species',
  type: 'string',
  links: [{ name: 'NCBI Taxonomy', url: 'https://foo.tdb' }],
  filters: [
    { id: 'speciesId1', name: 'name 1' },
    { id: 'speciesId2', name: 'name 2' },
    { id: 'speciesId3', name: 'name 3' },
    { id: 'speciesId4', name: 'name 4' },
    { id: 'speciesId5', name: 'name 5' },
    { id: 'speciesId6', name: 'name 6' }
  ],
  links: []
}

const diseaseFacet = {
  name: 'Disease',
  id: 'disease',
  type: 'string',
  links: [{ name: 'NCBI Taxonomy', url: 'https://foo.tdb' }],
  filters: [
    { id: 'disease1', name: 'd 1' },
    { id: 'disease2', name: 'd 2' },
    { id: 'disease3', name: 'd 3' },
    { id: 'disease4', name: 'd 4' },
    { id: 'disease5', name: 'd 5' },
    { id: 'disease6', name: 'd 6' }
  ],
  links: []
}

describe('Apply applies all changes made in the search panel', () => {
  it('applies keyword changes when applying from a facet', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <KeywordSearch/>
        <FacetControl facet={speciesFacet}/>
      </PropsStudySearchProvider>
    ))

    const speciesControl = function() {
      return container.querySelector('#facet-species')
    }
    const keywordInput = function() {
      return container.querySelector('input[name="keywordText"]')
    }

    fireEvent.change(keywordInput(), { target: { value: 'test123' } })
    fireEvent.click(container.querySelector('#facet-species > a'))
    fireEvent.click(speciesControl().querySelector('input#speciesId5'))
    fireEvent.click(speciesControl().querySelector('button.facet-apply-button'))

    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&terms=test123&facets=species%3AspeciesId5')
  })

  it('applies facet changes when keyword searching', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <KeywordSearch/>
        <FacetControl facet={speciesFacet}/>
        <FacetControl facet={diseaseFacet}/>
      </PropsStudySearchProvider>
    ))

    const speciesControl = function() {
      return container.querySelector('#facet-species')
    }
    const diseaseControl = function() {
      return container.querySelector('#facet-disease')
    }
    const keywordInput = function() {
      return container.querySelector('input[name="keywordText"]')
    }

    fireEvent.click(container.querySelector('#facet-species > a'))
    fireEvent.click(speciesControl().querySelector('input#speciesId2'))
    fireEvent.click(container.querySelector('#facet-disease > a'))
    fireEvent.click(diseaseControl().querySelector('input#disease4'))
    fireEvent.change(keywordInput(), { target: { value: 'test345' } })
    fireEvent.submit(keywordInput())
    const query = '?type=study&page=1&terms=test345&facets=species%3AspeciesId2%3Bdisease%3Adisease4'
    expect(routerNav).toHaveBeenLastCalledWith(query)
  })

  it('logs search result selection', () => {
    const fakeLog = jest.spyOn(MetricsApi, 'log')
    fakeLog.mockImplementation(() => {})

    logSelectSearchResult(bloodStudy, bloodLogProps)

    // Test analytics
    expect(fakeLog).toHaveBeenCalledWith(
      'select-search-result',
      {
        'studyAccession': 'SCP97',
        'context': 'study',
        'scope': 'global',
        'studySource': 'SCP',
        'public': true,
        'detached': false,
        'numCells': 130,
        'numGenes': 7,
        'facetMatches': null,
        'termMatches': ['blood'],
        'termSearchWeight': 3,
        'rank': 3,
        'results:type': 'study',
        'results:currentPage': 1,
        'results:numTotalStudies': 28,
        'results:numTotalPages': 3,
        'results:matchingAccessions': [
          'fetalLiverAndCordBloodCiteSeq', 'AdultHemOrgans', 'SCP97',
          'HumanTissueTcellActivation', 'nktpbmcZhou', 'HumanDCsFromPre-cDCs',
          'OleicAcidMultipleSclerosis', 'ImmuneRenalCarcinoma',
          'HnsccImmuneLandscape', 'HumanNaturalKillerDiversityYang',
          'Covid19PBMC', 'cellSignaturesInAlzheimer', 'Fetal/Maternal Interface',
          'GSE132065_BloodTimeHuman', 'scRNAseqOfFailingHumanHeart',
          'GSE114727_BreastTumorMicroenvironment', 'ancestryInfluencesImmuneResponse',
          'HumanPhagocytesHealthyLupusDutetre', 'scRNAseqSystemicComparison',
          'SCP96', 'ImmuneCellExhaustianHIV', 'SCP132', 'CITEseqPBMCProject',
          'TCellsNeuroinflammation', 'pbmcCov19Flu', 'SingleCellsMultipleSclerosis',
          'HeterogeneityCD4TCells', 'AcuteSkinInflammation'
        ],
        'results:presetSearch': null,
        'numSearchSelections': 1,
        'numSearches': 0,
        'results:numResults:scp:accession': 0,
        'results:numResults:scp:text': 3,
        'results:numResults:scp:author': 0,
        'query:terms': ['blood'],
        'query:termString': 'blood',
        'query:numTerms': 1,
        'query:genes': [],
        'query:geneString': undefined,
        'query:numGenes': 0,
        'query:numFacets': 0,
        'query:numFilters': 0,
        'query:facetList': [],
        'query:filterListByFacet': {}
      }
    )
  })
})
