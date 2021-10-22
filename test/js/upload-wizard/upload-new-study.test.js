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
import { EMPTY_STUDY, RAW_COUNTS_FILE } from './file-info-responses'
import { UserContext } from 'providers/UserProvider'

/** gets a pointer to the react-select node based on label text
 * This is non-trivial since our labels contain the select,
 * and so a naive getByLabelText will not work.
 * Instead we get the label using getByText and assume
 * the first div inside is the react-select element */
function getSelectByLabelText(screen, text) {
  return screen.getByText(text).querySelector('div')
}

describe('it allows creation of study files', () => {
  it('renders the raw counts from and allows updates and save', async () => {
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

    await testRawCountsUpload({ createFileSpy, saveButton })
    await testProcessedUpload({ createFileSpy, saveButton })
    expect(true).toBeTruthy()
  })
})

/** Uploads a raw count file and checks the field requirements */
async function testRawCountsUpload({ createFileSpy, saveButton }) {
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
    studyAccession: 'SCP1'
  }))
}


/** Uploads a processed expression file and checks the field requirements */
async function testProcessedUpload({ createFileSpy, saveButton }) {
  fireEvent.click(screen.getByText('Processed Matrices'))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Processed Expression Files')

  expect(saveButton()).toBeDisabled()
  fireEvent.mouseOver(saveButton())
  expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')
}
