import { computeCorrelations } from 'lib/stats'

const scatter = {}
scatter.data = {
  annotations: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
  x: [86, 97, 99, 100, 101, 103, 106, 110, 112, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  y: [2, 20, 28, 27, 50, 29, 7, 17, 6, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}

describe('Correlation for scatter plots', () => {
  it('computes bulk and per-label correlation', async () => {
    // Tests "Monkey correlation" synthetic study
    // To manually test:
    // 1. Populate synthetic study: SyntheticStudyPopulator.populate('monkey_correlations')
    // 2. Go to study
    // 3. Search ADCY5 and AGPAT2
    // 4. In "Annotation" menu, select "Category"
    const correlations = await computeCorrelations(scatter)
    const bulk = Math.round(correlations.bulk * 1000) / 1000
    const correlationA = Math.round(correlations.byLabel['A'] * 100) / 100
    const correlationB = correlations.byLabel['B']

    expect(bulk).toEqual(0.833)
    expect(correlationA).toEqual(-0.18)
    expect(correlationB).toEqual(0)
  })
})
