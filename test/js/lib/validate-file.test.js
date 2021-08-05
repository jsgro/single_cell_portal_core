const fs = require('fs')
import * as Io from 'lib/validation/io'
import * as ValidateFile from 'lib/validation/validate-file'

const mockDir = 'public/mock_data/validation'

describe('Client-side file validation', () => {
  it('catches metadata TYPE header errors', async () => {
    const mockPath = `${mockDir}/metadata_example_bad_TYPE.txt`
    const fileContent = fs.readFileSync(mockPath, 'utf8')

    /** Mock function that uses FileReader, which isn't available in Node */
    const readLinesAndType = jest.spyOn(Io, 'readLinesAndType')
    const lines = fileContent.split(/\r?\n/).slice()
    const type = 'text-foo/plain-bar'
    readLinesAndType.mockImplementation(() => Promise.resolve({ lines, type }))

    const errors = await ValidateFile.validateFile(fileContent, 'metadata')

    expect(errors).toHaveLength(1)
  })
})
