import { screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import _cloneDeep from 'lodash/cloneDeep'
import selectEvent from 'react-select-event'

import { fireFileSelectionEvent } from '../lib/file-mock-utils'
import * as ScpApi from 'lib/scp-api'
import {
  RAW_COUNTS_FILE, PROCESSED_MATRIX_FILE, METADATA_FILE,
  CLUSTER_FILE, COORDINATE_LABEL_FILE, FASTQ_FILE
} from './file-info-responses'
import { renderWizardWithStudy, getSelectByLabelText, saveButton } from './upload-wizard-test-utils'

const processedFileName = 'example_processed_dense.txt'
const rawCountsFileName = 'example_raw_counts.txt'

describe('creation of study files', () => {
  beforeAll(() => {
    jest.restoreAllMocks()
    // This test is long--running all steps in series, so allow extra time
    jest.setTimeout(10000)
  })

  afterEach(() => {
    // Restores all mocks back to their original value
    jest.restoreAllMocks()
    jest.setTimeout(5000)
  })

  it('allows upload of all common file types in sequence', async () => {
    const createFileSpy = jest.spyOn(ScpApi, 'createStudyFile')

    await renderWizardWithStudy({ featureFlags: { raw_counts_required_frontend: true } })
    expect(screen.getByText('View study')).toHaveProperty('href', 'http://localhost/single_cell/study/SCP1')

    await testRawCountsUpload({ createFileSpy })
    await testProcessedUpload({ createFileSpy })
    await testMetadataUpload({ createFileSpy })
    await testClusterUpload({ createFileSpy })
    await testSpatialUpload({ createFileSpy })
    await testCoordinateLabelUpload({ createFileSpy })
    await testSequenceFileUpload({ createFileSpy })

    expect(screen.getByTestId('rawCounts-status-badge')).toHaveClass('complete')
    expect(screen.getByTestId('processed-status-badge')).toHaveClass('complete')
    expect(screen.getByTestId('metadata-status-badge')).toHaveClass('complete')
    expect(screen.getByTestId('clustering-status-badge')).toHaveClass('complete')
    expect(screen.getByTestId('spatial-status-badge')).toHaveClass('complete')
    expect(screen.getByTestId('coordinateLabels-status-badge')).toHaveClass('complete')
    expect(screen.getByTestId('sequence-status-badge')).toHaveClass('complete')
    expect(screen.getByTestId('images-status-badge')).not.toHaveClass('complete')

    // now check that we can go back to a previously saved file and it shows correctly
    fireEvent.click(screen.getByText('Processed Matrices'))
    expect(screen.getByTestId('file-uploaded-name')).toHaveTextContent(processedFileName)
    expect(getSelectByLabelText(screen, 'Associated Raw Counts Files')).toHaveTextContent(rawCountsFileName)
  })
})

/** Uploads a raw count file and checks the field requirements */
async function testRawCountsUpload({ createFileSpy }) {
  const formData = new FormData()

  createFileSpy.mockImplementation(() => ({
    ...RAW_COUNTS_FILE,
    name: rawCountsFileName,
    upload_file_name: rawCountsFileName
  }))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Raw Count Expression Files')

  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: rawCountsFileName,
    content: 'GENE,cell1,cell2\ngene1,1,2'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.getByTestId('rawCounts-status-badge')).toHaveTextContent('1')
  expect(screen.getByTestId('file-selection-name')).toHaveTextContent(rawCountsFileName)
  expect(saveButton()).toBeDisabled()

  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).not.toHaveTextContent('You must select a file')
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must specify units')
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must specify species')
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must specify Library preparation protocol')

  await selectEvent.select(getSelectByLabelText(screen, 'Species *'), 'chicken')
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).not.toHaveTextContent('You must specify species')

  await selectEvent.select(getSelectByLabelText(screen, 'Library Preparation Protocol *'), 'Drop-seq')
  await selectEvent.select(getSelectByLabelText(screen, 'Units *'), 'raw counts')
  expect(saveButton()).not.toBeDisabled()

  fireEvent.click(saveButton())
  await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

  expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
    chunkEnd: 26,
    chunkStart: 0,
    fileSize: 26,
    isChunked: false,
    studyAccession: 'SCP1',
    studyFileData: formData
  }))
  expect(screen.getByTestId('rawCounts-status-badge')).toHaveClass('complete')
  expect(screen.getByTestId('processed-status-badge')).not.toHaveTextContent('1')
}


/** Uploads a processed expression file and checks the field requirements */
async function testProcessedUpload({ createFileSpy }) {
  const formData = new FormData()

  // mock the create file response with a file that has the right name and associated raw counts files
  createFileSpy.mockImplementation(() => ({
    ...PROCESSED_MATRIX_FILE,
    name: processedFileName,
    upload_file_name: processedFileName,
    expression_file_info: {
      ...PROCESSED_MATRIX_FILE.expression_file_info,
      raw_counts_associations: [RAW_COUNTS_FILE._id.$oid]
    }
  }))

  fireEvent.click(screen.getByText('Processed Matrices'))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Processed Expression Files')
  expect(screen.getByTestId('processed-status-badge')).toHaveTextContent('2')
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')
  expect(screen.getByRole('tooltip')).not.toHaveTextContent('You must specify units')

  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: processedFileName,
    content: 'GENE,cell1,cell2\ngene1.1,1.3,2.1'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.getByTestId('file-selection-name')).toHaveTextContent(processedFileName)
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).not.toHaveTextContent('You must select a file')
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must specify species')
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must specify Library preparation protocol')

  expect(saveButton()).toBeDisabled()
  await selectEvent.select(getSelectByLabelText(screen, 'Species *'), 'chicken')
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).not.toHaveTextContent('You must specify species')

  await selectEvent.select(getSelectByLabelText(screen, 'Library Preparation Protocol *'), 'Drop-seq')
  expect(saveButton()).not.toBeDisabled()

  await selectEvent.select(getSelectByLabelText(screen, 'Associated Raw Counts Files'), rawCountsFileName)

  fireEvent.click(saveButton())
  await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

  expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
    chunkEnd: 32,
    chunkStart: 0,
    fileSize: 32,
    isChunked: false,
    studyAccession: 'SCP1',
    studyFileData: formData
  }))
  expect(screen.getByTestId('processed-status-badge')).not.toHaveTextContent('2')
  expect(screen.getByTestId('processed-status-badge')).toHaveClass('complete')
}

/** Uploads a metadata file and checks the field requirements */
async function testMetadataUpload({ createFileSpy }) {
  const formData = new FormData()

  createFileSpy.mockImplementation(() => _cloneDeep(METADATA_FILE))

  fireEvent.click(screen.getByText('Metadata'))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Metadata')
  expect(screen.getByTestId('metadata-status-badge')).toHaveTextContent('3')
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const badFileName = 'metadata-bad.txt'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: badFileName,
    content: 'garbage'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.queryByTestId('file-selection-name')).toBeFalsy()
  expect(screen.getByTestId('file-content-validation')).toHaveTextContent(`Could not use ${badFileName}`)
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')


  const goodFileName = 'metadata-good.txt'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: goodFileName,
    content: 'NAME,cell_type,cell_type__ontology_label,organism_age,disease,disease__ontology_label,species,species__ontology_label,geographical_region,geographical_region__ontology_label,library_preparation_protocol,library_preparation_protocol__ontology_label,organ,organ__ontology_label,sex,is_living,organism_age__unit,organism_age__unit_label,ethnicity__ontology_label,ethnicity,race,race__ontology_label,sample_type,donor_id,biosample_id,biosample_type,preservation_method\nTYPE,group,group,numeric,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.getByTestId('file-selection-name')).toHaveTextContent(goodFileName)
  expect(saveButton()).not.toBeDisabled()

  fireEvent.click(saveButton())
  await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

  expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
    chunkEnd: 627,
    chunkStart: 0,
    fileSize: 627,
    isChunked: false,
    studyAccession: 'SCP1',
    studyFileData: formData
  }))
  expect(screen.getByTestId('metadata-status-badge')).not.toHaveTextContent('3')
  expect(screen.getByTestId('metadata-status-badge')).toHaveClass('complete')
}

/** Uploads a cluster file and checks the field requirements */
async function testClusterUpload({ createFileSpy }) {
  const formData = new FormData()

  createFileSpy.mockImplementation(() => _cloneDeep(CLUSTER_FILE))

  fireEvent.click(screen.getByText('Clustering'))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Clustering')
  expect(screen.getByTestId('clustering-status-badge')).toHaveTextContent('4')
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const badFileName = 'cluster-bad.txt'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: badFileName,
    content: 'garbage'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.queryByTestId('file-selection-name')).toBeFalsy()
  expect(screen.getByTestId('file-content-validation')).toHaveTextContent(`Could not use ${badFileName}`)
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const goodFileName = 'cluster-good.txt'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: goodFileName,
    content: 'NAME,X,Y\nTYPE,numeric,numeric\nCell1,1,0\n'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.getByTestId('file-selection-name')).toHaveTextContent(goodFileName)
  expect(saveButton()).not.toBeDisabled()

  fireEvent.click(saveButton())
  await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

  expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
    chunkEnd: 40,
    chunkStart: 0,
    fileSize: 40,
    isChunked: false,
    studyAccession: 'SCP1',
    studyFileData: formData
  }))
  expect(screen.getByTestId('clustering-status-badge')).not.toHaveTextContent('4')
  expect(screen.getByTestId('clustering-status-badge')).toHaveClass('complete')
}

/** Uploads a spatial file and checks the field requirements */
async function testSpatialUpload({ createFileSpy }) {
  const formData = new FormData()
  const goodFileName = 'spatial-good.txt'
  const spatialResponse = {
    ..._cloneDeep(CLUSTER_FILE),
    _id: {
      '$oid': '60a2b9fccc7ba082358b3333'
    },
    is_spatial: true,
    name: goodFileName,
    upload_file_name: goodFileName
  }
  createFileSpy.mockImplementation(() => spatialResponse)

  fireEvent.click(screen.getByText('Spatial Files (optional)'))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Spatial Files')
  expect(screen.getByTestId('spatial-status-badge')).not.toHaveClass('complete')
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const badFileName = 'spatial-bad.txt'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: badFileName,
    content: 'garbage'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.queryByTestId('file-selection-name')).toBeFalsy()
  expect(screen.getByTestId('file-content-validation')).toHaveTextContent(`Could not use ${badFileName}`)
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: goodFileName,
    content: 'NAME,X,Y\nTYPE,numeric,numeric\nCell1,1,0\n'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.getByTestId('file-selection-name')).toHaveTextContent(goodFileName)
  expect(saveButton()).not.toBeDisabled()

  fireEvent.click(saveButton())
  await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

  expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
    chunkEnd: 40,
    chunkStart: 0,
    fileSize: 40,
    isChunked: false,
    studyAccession: 'SCP1',
    studyFileData: formData
  }))

  expect(screen.getByTestId('spatial-status-badge')).toHaveClass('complete')
}

/** Uploads a coordinate label file and checks the field requirements */
async function testCoordinateLabelUpload({ createFileSpy }) {
  const formData = new FormData()

  createFileSpy.mockImplementation(() => _cloneDeep(COORDINATE_LABEL_FILE))

  fireEvent.click(screen.getByText('Coordinate Labels'))
  expect(screen.getByTestId('coordinateLabels-status-badge')).not.toHaveClass('complete')
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const badFileName = 'labels-bad.txt.gz'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: badFileName,
    content: 'garbage'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.queryByTestId('file-selection-name')).toBeFalsy()
  expect(screen.getByTestId('file-content-validation')).toHaveTextContent(`Could not use ${badFileName}`)
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const goodFileName = 'labels-good.txt'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: goodFileName,
    content: 'X,Y,LABELS\n10,10,stuff\n50,70,things\n'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.getByTestId('file-selection-name')).toHaveTextContent(goodFileName)
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must specify Corresponding cluster')

  await selectEvent.select(getSelectByLabelText(screen, 'Corresponding cluster / spatial data *'), 'cluster.txt')

  expect(saveButton()).not.toBeDisabled()
  fireEvent.click(saveButton())
  await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

  expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
    chunkEnd: 36,
    chunkStart: 0,
    fileSize: 36,
    isChunked: false,
    studyAccession: 'SCP1',
    studyFileData: formData
  }))
  expect(screen.getByTestId('coordinateLabels-status-badge')).toHaveClass('complete')
}

/** Uploads a fastq file and checks the field requirements */
async function testSequenceFileUpload({ createFileSpy }) {
  const formData = new FormData()

  createFileSpy.mockImplementation(() => _cloneDeep(FASTQ_FILE))

  fireEvent.click(screen.getByText('Sequence Files'))
  expect(screen.getByTestId('sequence-status-badge')).not.toHaveClass('complete')
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const badFileName = 'sequence-bad.foo'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: badFileName,
    content: 'garbage'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.queryByTestId('file-selection-name')).toBeFalsy()
  expect(screen.getByTestId('file-content-validation')).toHaveTextContent(`Could not use ${badFileName}`)
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const goodFileName = 'sequence-good.fastq'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: goodFileName,
    content: 'binary stuff'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.getByTestId('file-selection-name')).toHaveTextContent(goodFileName)
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must specify species')

  await selectEvent.select(getSelectByLabelText(screen, 'Species *'), 'chicken')

  expect(saveButton()).not.toBeDisabled()
  fireEvent.click(saveButton())
  await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

  expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
    chunkEnd: 12,
    chunkStart: 0,
    fileSize: 12,
    isChunked: false,
    studyAccession: 'SCP1',
    studyFileData: formData
  }))
  expect(screen.getByTestId('sequence-status-badge')).toHaveClass('complete')
}

COORDINATE_LABEL_FILE
