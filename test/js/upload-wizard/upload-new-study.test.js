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
import { EMPTY_STUDY, RAW_COUNTS_FILE, PROCESSED_MATRIX_FILE, METADATA_FILE } from './file-info-responses'
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
  })
})

/** Uploads a raw count file and checks the field requirements */
async function testRawCountsUpload({ createFileSpy, saveButton }) {
  const formDataRaw = new FormData()

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
    studyFileData: formDataRaw
  }))
  expect(screen.getByTestId('rawCounts-status-badge')).toHaveClass('complete')
  expect(screen.getByTestId('processed-status-badge')).not.toHaveTextContent('1')
}


/** Uploads a processed expression file and checks the field requirements */
async function testProcessedUpload({ createFileSpy, saveButton }) {
  const formDataProcessed = new FormData()

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
    studyFileData: formDataProcessed
  }))
  expect(screen.getByTestId('processed-status-badge')).not.toHaveTextContent('2')
  expect(screen.getByTestId('processed-status-badge')).toHaveClass('complete')
}

/** Uploads a metadata file and checks the field requirements */
async function testMetadataUpload({ createFileSpy, saveButton }) {
  const formDataMetadata = new FormData()

  createFileSpy.mockImplementation(() => _cloneDeep(METADATA_FILE))

  fireEvent.click(screen.getByText('Metadata'))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Metadata')
  expect(screen.getByTestId('metadata-status-badge')).toHaveTextContent('3')
  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

  const badMetadataFileName = 'metadata-bad.txt'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: badMetadataFileName,
    content: 'garbage'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.queryByTestId('file-selection-name')).toBeFalsy()
  expect(screen.getByTestId('file-content-validation')).toHaveTextContent(`Could not use ${badMetadataFileName}`)
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')


  const goodMetadataFileName = 'metadata-good.txt'
  fireFileSelectionEvent(screen.getByTestId('file-input'), {
    fileName: goodMetadataFileName,
    content: 'NAME,cell_type,cell_type__ontology_label,organism_age,disease,disease__ontology_label,species,species__ontology_label,geographical_region,geographical_region__ontology_label,library_preparation_protocol,library_preparation_protocol__ontology_label,organ,organ__ontology_label,sex,is_living,organism_age__unit,organism_age__unit_label,ethnicity__ontology_label,ethnicity,race,race__ontology_label,sample_type,donor_id,biosample_id,biosample_type,preservation_method\nTYPE,group,group,numeric,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group,group'
  })
  await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
  expect(screen.getByTestId('file-selection-name')).toHaveTextContent(goodMetadataFileName)
  expect(saveButton()).not.toBeDisabled()

  fireEvent.click(saveButton())
  await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

  expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
    chunkEnd: 627,
    chunkStart: 0,
    fileSize: 627,
    isChunked: false,
    studyAccession: 'SCP1',
    studyFileData: formDataMetadata
  }))
  expect(screen.getByTestId('metadata-status-badge')).not.toHaveTextContent('3')
  expect(screen.getByTestId('metadata-status-badge')).toHaveClass('complete')
}
