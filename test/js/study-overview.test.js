import {
  getBaseLayout, get3DScatterProps, get2DScatterProps
} from 'lib/study-overview'

const height = 279
const width = 1570

describe('Study Overview page', () => {

  it('configures plot layout', async() => {
    // Test base layout
    const layout = getBaseLayout(height, width)
    expect(layout.height).toBe(height)
    expect(layout.width).toBe(width)
  })

})
