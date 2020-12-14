import {
  getBaseLayout, setMarkerColors
} from 'lib/study-overview'

const height = 279
const width = 1570

describe('Study Overview page', () => {
  it('configures plot layout', () => {
    // Test base layout
    const layout = getBaseLayout(height, width)
    expect(layout.height).toBe(height)
    expect(layout.width).toBe(width)
  })

  it('sets expected colors in categorical scatter plots', () => {
    let data = [{ marker: {} }, { marker: {} }, { marker: {} }]
    data = setMarkerColors(data)
    expect(data[0].marker.color).toBe('#e41a1c')
    expect(data[2].marker.color).toBe('#4daf4a')
  })
})
