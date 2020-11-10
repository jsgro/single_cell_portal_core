import {
  getBaseLayout, get3DScatterProps, get2DScatterProps
} from 'lib/study-overview'

const height = 279
const width = 1570

describe('Study Overview page', () => {

  it('configures plot layout', async() => {
    const layout = getBaseLayout(height, width)
    const expectedLayout = {"hovermode":"closest","margin":{"t":25,"r":0,"b":20,"l":0},"height":279,"width":1570,"font":{"family":"Helvetica Neue","size":12,"color":"#333"}}
    expect(layout).toStrictEqual(expectedLayout);
  })

})
