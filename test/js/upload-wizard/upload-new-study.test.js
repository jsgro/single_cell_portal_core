import React from 'react'
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import _cloneDeep from 'lodash/cloneDeep'
import selectEvent from 'react-select-event'
import ReactNotification from 'react-notifications-component'

import { RawUploadWizard } from 'components/upload/UploadWizard'
import MockRouter from '../lib/MockRouter'
import { fireFileSelectionEvent } from '../lib/file-mock-utils'
import * as ScpApi from 'lib/scp-api'
import {
  EMPTY_STUDY, RAW_COUNTS_FILE, PROCESSED_MATRIX_FILE, METADATA_FILE,
  CLUSTER_FILE
} from './file-info-responses'
import { UserContext } from 'providers/UserProvider'

/** gets a pointer to the react-select node based on label text
 * This is non-trivial since our labels contain the select,
 * and so a naive getByLabelText will not work.
 * Instead we get the label using getByText and assume
 * the first div inside is the react-select element */
function getSelectByLabelText(screen, text) {
  return screen.getByText(text).querySelector('div')
}

describe('creation of study files', () => {
  it('renders the raw counts form and allows updates and save', async () => {
    const studyInfoSpy = jest.spyOn(ScpApi, 'fetchStudyFileInfo')
    // pass in a clone of the response since it may get modified by the cache operations
    studyInfoSpy.mockImplementation(params => {
      const response = _cloneDeep(EMPTY_STUDY)
      return Promise.resolve(response)
    })

    const createFileSpy = jest.spyOn(ScpApi, 'createStudyFile')

    const featureFlags = { raw_counts_required_frontend: true }
    render(<UserContext.Provider value={{ featureFlagsWithDefaults: featureFlags }}>
      <ReactNotification/>
      <MockRouter>
        <RawUploadWizard studyAccession="SCP1" name="Chicken study"/>
      </MockRouter>
    </UserContext.Provider>)
    const saveButton = () => screen.getByTestId('file-save')
    await waitForElementToBeRemoved(() => screen.getByTestId('upload-wizard-spinner'))
    expect(screen.getByText('View study')).toHaveProperty('href', 'http://localhost/single_cell/study/SCP1')

    await testRawCountsUpload({ createFileSpy, saveButton })
    await testProcessedUpload({ createFileSpy, saveButton })
    await testMetadataUpload({ createFileSpy, saveButton })
    await testClusterUpload({ createFileSpy, saveButton })
    await testSpatialUpload({ createFileSpy, saveButton })
  })
})

/** Uploads a raw count file and checks the field requirements */
async function testRawCountsUpload({ createFileSpy, saveButton }) {
  const formData = new FormData()

  createFileSpy.mockImplementation(() => _cloneDeep(RAW_COUNTS_FILE))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Raw Count Expression Files')

  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const rawCountsFileName = 'example_raw_counts.txt'
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
async function testProcessedUpload({ createFileSpy, saveButton }) {
  const formData = new FormData()

  createFileSpy.mockImplementation(() => _cloneDeep(PROCESSED_MATRIX_FILE))

  fireEvent.click(screen.getByText('Processed Matrices'))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Processed Expression Files')
  expect(screen.getByTestId('processed-status-badge')).toHaveTextContent('2')
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')
  expect(screen.getByRole('tooltip')).not.toHaveTextContent('You must specify units')

  const processedFileName = 'example_processed_dense.txt'
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
async function testMetadataUpload({ createFileSpy, saveButton }) {
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

/** Uploads a metadata file and checks the field requirements */
async function testClusterUpload({ createFileSpy, saveButton }) {
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
  expect(screen.getByTestId('clustering-status-badge')).not.toHaveTextContent('3')
  expect(screen.getByTestId('clustering-status-badge')).toHaveClass('complete')
}

/** Uploads a metadata file and checks the field requirements */
async function testSpatialUpload({ createFileSpy, saveButton }) {
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

