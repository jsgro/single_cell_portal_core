import React from 'react'
import { render, screen, fireEvent, waitForElementToBeRemoved, act } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import _cloneDeep from 'lodash/cloneDeep'

import MockRouter from '../lib/MockRouter'
import { UserContext } from 'providers/UserProvider'
import { RawUploadWizard } from 'components/upload/UploadWizard'
import * as ScpApi from 'lib/scp-api'
import { EMPTY_STUDY } from './file-info-responses'


describe('it allows navigating between steps', () => {
  it('navigates between steps on clicking step names', async () => {
    const studyInfoSpy = jest.spyOn(ScpApi, 'fetchStudyFileInfo')
    // pass in a clone of the response since it may get modified by the cache operations
    studyInfoSpy.mockImplementation(params => {
      const response = _cloneDeep(EMPTY_STUDY)
      return Promise.resolve(response)
    })

    render(<MockRouter>
      <RawUploadWizard studyAccession="SCP1" name="Chicken study"/>
    </MockRouter>)
    await waitForElementToBeRemoved(() => screen.getByTestId('upload-wizard-spinner'))

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Raw Count Expression Files')

    fireEvent.click(screen.getByText('Processed Matrices'))
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Processed Expression Files')

    fireEvent.click(screen.getByText('Coordinate Labels'))
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Coordinate Labels')
  })

  it('prevents access to processed matrices when appropriate', async () => {
    const studyInfoSpy = jest.spyOn(ScpApi, 'fetchStudyFileInfo')
    // pass in a clone of the response since it may get modified by the cache operations
    studyInfoSpy.mockImplementation(params => {
      const response = _cloneDeep(EMPTY_STUDY)
      return Promise.resolve(response)
    })
    const featureFlags = { raw_counts_required_frontend: true }
    render(
      <UserContext.Provider value={{ featureFlagsWithDefaults: featureFlags }}>
        <MockRouter>
          <RawUploadWizard studyAccession="SCP1" name="Chicken study"/>
        </MockRouter>
      </UserContext.Provider>
    )

    await waitForElementToBeRemoved(() => screen.getByTestId('upload-wizard-spinner'))

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Raw Count Expression Files')
    expect(screen.queryByTestId('file-upload-overlay')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Processed Matrices'))
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Processed Expression Files')
    expect(screen.queryByTestId('processed-matrix-overlay')).toBeInTheDocument()
  })

  it('sets initial tab based on url params', async () => {
    render(
      <MockRouter initialSearch={'?step=clustering'}>
        <RawUploadWizard studyAccession="SCP1" name="Chicken study"/>
      </MockRouter>
    )
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Clustering')
  })
})
