import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import DifferentialExpressionPanel from 'components/explore/DifferentialExpressionPanel'

describe('Differential expression panel', () => {
  it('renders DE genes table', async () => {
    const deGroup = 'KRT high lactocytes 1'
    const deGenes = [
      {
        'score': 77.55,
        'log2FoldChange': 3.434,
        'pval': 0,
        'pvalAdj': 0,
        'pctNzGroup': 0.9625,
        'pctNzReference': 0.5864,
        'name': 'SOD2'
      },
      {
        'score': 75.4,
        'log2FoldChange': 4.302,
        'pval': 0,
        'pvalAdj': 0,
        'pctNzGroup': 0.8543,
        'pctNzReference': 0.2124,
        'name': 'ANXA1'
      }
    ]

    const searchGenes = function() {}

    const exploreInfo = {
      'taxonNames': [
        'Homo sapiens'
      ],
      'annotationList': {
        'annotations': [
          {
            'name': 'General_Celltype',
            'type': 'group',
            'values': [
              'LC2',
              'GPMNB macrophages',
              'neutrophils',
              'B cells',
              'T cells',
              'removed',
              'CSN1S1 macrophages',
              'dendritic cells',
              'LC1',
              'eosinophils',
              'fibroblasts'
            ],
            'scope': 'study'
          },
          {
            'name': 'time_post_partum_days',
            'type': 'numeric',
            'values': [],
            'scope': 'study'
          },
          {
            'name': 'milk_stage',
            'type': 'group',
            'values': [
              'late_1',
              'mature',
              'early',
              'late_2',
              'transitional ',
              'transitional',
              'late_4',
              'NA',
              'late_3'
            ],
            'scope': 'study'
          },
          {
            'name': 'vaccines_list',
            'type': 'group',
            'values': [
              'NA',
              '9/3 and 9/10 – a hep B booster in the hospital',
              'no',
              '5/9/19 hepatitis B',
              'hepB ',
              'vaccines on 5/15',
              '(6/11) Dtap-hep, BIPV, rotavirus, pentavalent, big (PRP-T)',
              'HepB',
              'hepB (says 4/22 but probably 5/22?)',
              '4/3/19 Hepatitis B (at birth) ',
              '2 month vaccines',
              'Dtap, Gib, IPV, PCU13, Rotavirus (8/16/19)',
              'vaccines on 7/15',
              'influenza (day prior to sample)'
            ],
            'scope': 'study'
          },
          {
            'name': 'Epithelial Cell Subclusters',
            'type': 'group',
            'values': [
              'Secretory Lactocytes',
              'LC1',
              'KRT high lactocytes 1',
              'Cycling Lactocytes',
              'MT High Secretory Lactocytes',
              'KRT high lactocytes 2'
            ],
            'scope': 'cluster',
            'cluster_name': 'Epithelial Cells UMAP'
          }
        ],
        'clusters': [
          'Epithelial Cells UMAP',
          'All Cells UMAP'
        ]
      },
      'clusterGroupNames': [
        'Epithelial Cells UMAP',
        'All Cells UMAP'
      ],
      'bucketId': 'fc-65379b91-5ded-4d28-8e51-ada209542117'
    }

    const exploreParamsWithDefaults = {
      'cluster': 'Epithelial Cells UMAP',
      'annotation': {
        'name': 'Epithelial Cell Subclusters',
        'type': 'group',
        'scope': 'cluster'
      },
      'genes': [
        'SOD2'
      ]
    }

    const clusterName = 'Epithelial Cells UMAP'
    const annotation = {
      'name': 'Epithelial Cell Subclusters',
      'type': 'group',
      'scope': 'cluster'
    }

    const setShowDeGroupPicker = function() {}
    const setDeGenes = function() {}
    const setDeGroup = function() {}

    const countsByLabel = {
      'Secretory Lactocytes': 25787,
      'LC1': 4920,
      'KRT high lactocytes 1': 3734,
      'Cycling Lactocytes': 604,
      'MT High Secretory Lactocytes': 3052,
      'KRT high lactocytes 2': 1728
    }

    render((
      <DifferentialExpressionPanel
        deGroup={deGroup}
        deGenes={deGenes}
        searchGenes={searchGenes}
        exploreParamsWithDefaults={exploreParamsWithDefaults}
        exploreInfo={exploreInfo}
        clusterName={clusterName}
        bucketId={exploreInfo?.bucketId}
        annotation={annotation}
        setShowDeGroupPicker={setShowDeGroupPicker}
        setDeGenes={setDeGenes}
        setDeGroup={setDeGroup}
        countsByLabel={countsByLabel}
      />
    ))

    const deTable = await screen.findByTestId('differential-expression-table')
    expect(deTable).toHaveTextContent('ANXA1')
  })
})
