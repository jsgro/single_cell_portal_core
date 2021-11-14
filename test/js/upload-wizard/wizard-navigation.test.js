import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import MockRouter from '../lib/MockRouter'
import { RawUploadWizard } from 'components/upload/UploadWizard'
import { renderWizardWithStudy } from './upload-wizard-test-utils'


describe('it allows navigating between steps', () => {
  afterEach(() => {
    // Restores all mocks back to their original value
    jest.restoreAllMocks()
  })

  it('navigates between steps on clicking step names', async () => {
    await renderWizardWithStudy({})

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Raw count expression files')

    fireEvent.click(screen.getByText('Processed matrices'))
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Processed expression files')

    fireEvent.click(screen.getByText('Coordinate labels'))
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Coordinate labels')
  })

  it('prevents access to processed matrices when appropriate', async () => {
    await renderWizardWithStudy({ featureFlags: { raw_counts_required_frontend: true } })

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Raw count expression files')
    expect(screen.queryByTestId('file-upload-overlay')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Processed matrices'))
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Processed expression files')
    expect(screen.queryByTestId('processed-matrix-overlay')).toBeInTheDocument()
  })

  it('sets initial tab based on url params', async () => {
    jest.spyOn(ScpApi, 'fetchStudyFileInfo').mockImplementation(() => {return new Promise(() => {})})
    render(
      <MockRouter initialSearch={'?tab=clustering'}>
        <RawUploadWizard studyAccession="SCP1" name="Chicken study"/>
      </MockRouter>
    )
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Clustering')
  })
})
