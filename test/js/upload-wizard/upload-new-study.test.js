import React from 'react'
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import _cloneDeep from 'lodash/cloneDeep'
import selectEvent from 'react-select-event'

import UploadWizard from 'components/upload/UploadWizard'
import { fireFileSelectionEvent } from './file-upload-control.test.js'
import * as ScpApi from 'lib/scp-api'
import { EMPTY_STUDY, RAW_COUNTS_FILE } from './file-info-responses'

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
    // pass in a clone of the response since it may get modified by the cache operations
    createFileSpy.mockImplementation(() => RAW_COUNTS_FILE)

    render(<UploadWizard studyAccession="SCP1" name="Chicken study"/>)
    const saveButton = () => screen.getByTestId('file-save')
    await waitForElementToBeRemoved(() => screen.getByTestId('upload-wizard-spinner'))

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Raw Count Expression Files')
    expect(saveButton()).toBeDisabled()
    fireEvent.mouseOver(saveButton())
    expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

    const rawCountsFileName = 'example_raw_counts.txt'
    fireFileSelectionEvent(screen.getByTestId('file-input'), { fileName: rawCountsFileName })
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
      chunkEnd: 10,
      chunkStart: 0,
      fileSize: 10,
      isChunked: false,
      studyAccession: 'SCP1'
    }))
  })
})
