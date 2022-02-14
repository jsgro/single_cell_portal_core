
describe('testing for tests', () => {
  it('fails when asserts fail', async () => {
    expect(1).toEqual(0)
  })

  it('fails when errors happen', async () => {
    throw 'unepected crazy error'
  })

  it('succeeds when tests succeed', async () => {
    expect(1).toEqual(1)
  })
})
