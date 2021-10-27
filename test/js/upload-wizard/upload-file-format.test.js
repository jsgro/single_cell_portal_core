import '@testing-library/jest-dom/extend-expect'
import { formatFileForApi } from 'components/upload/upload-utils'
import { RAW_COUNTS_FILE, METADATA_FILE, EXPRESSION_FILE } from './file-info-responses'


describe('a new FormData is created for valid file uploads', () => {
  const fileEnd = 10000
  const fileStart = 0

  it('processes a raw counts file correctly', async () => {
    const file = RAW_COUNTS_FILE
    const result = formatFileForApi(file, fileStart, fileEnd)

    expect(result.get('study_file[name]')).toEqual('example_raw_counts.txt')
    expect(result.get('study_file[file_type]')).toEqual('Expression Matrix')
  })
  it('processes a metadata file correctly', async () => {
    const file = METADATA_FILE
    const result = formatFileForApi(file, fileStart, fileEnd)

    expect(result.get('study_file[name]')).toEqual('metadata.txt')
    expect(result.get('study_file[file_type]')).toEqual('Metadata')
  })
  it('processes an expression file correctly', async () => {
    const file = EXPRESSION_FILE
    const result = formatFileForApi(file, fileStart, fileEnd)

    expect(result.get('study_file[name]')).toEqual('raw2_chicken_40_cells_4_genes.processed_dense.txt')
    expect(result.get('study_file[file_type]')).toEqual('Expression Matrix')
    expect(result.get('study_file[options][key1]')).toEqual('value1')
  })
})
