import { screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import { SEURAT_DATA_FILE, ANNDATA_FILE } from './file-info-responses'
import { fireFileSelectionEvent } from '../lib/file-mock-utils'
import { renderWizardWithStudy, saveButton, mockCreateStudyFile } from './upload-wizard-test-utils'

describe('Upload wizard supports uploading AnnData and Seurat Data files', () => {
  it('validates bad file name then starts upload of Seurat Data file', async () => {
    const createFileSpy = mockCreateStudyFile(SEURAT_DATA_FILE)

    await renderWizardWithStudy({ featureFlags: { h5ad_and_seurat_upload: true } })

    const formData = new FormData()
    fireEvent.click(screen.getByText('Seurat data'))

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Seurat data')

    expect(saveButton()).toBeDisabled()
    fireEvent.mouseOver(saveButton())
    expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

    const badFileName = 'raw_counts.wrong'
    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: badFileName,
      content: 'crap\n'
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
    expect(screen.getByTestId('validation-error')).toHaveTextContent(`after correcting ${badFileName}`)

    const seuratDataFileName = 'seuratdata.rds'
    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: seuratDataFileName,
      content: 'binarystuff' // we'll want to update this if we ever add client-side image file format checks
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))

    expect(screen.getByTestId('file-selection-name')).toHaveTextContent(seuratDataFileName)
    expect(saveButton()).not.toBeDisabled()

    fireEvent.click(saveButton())
    await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

    expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      chunkEnd: 11,
      chunkStart: 0,
      fileSize: 11,
      isChunked: false,
      studyAccession: 'SCP1',
      studyFileData: formData
    }))
  })

  it('validates bad file name, then starts upload of AnnData file', async () => {
    const createFileSpy = mockCreateStudyFile(ANNDATA_FILE)

    await renderWizardWithStudy({ featureFlags: { h5ad_and_seurat_upload: true } })

    const formData = new FormData()
    fireEvent.click(screen.getByText('AnnData (.h5ad)'))

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('AnnData files')

    expect(saveButton()).toBeDisabled()
    fireEvent.mouseOver(saveButton())
    expect(screen.getByRole('tooltip')).toHaveTextContent('You must select a file')

    const badFileName = 'raw_counts.wrong'
    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: badFileName,
      content: 'crap\n'
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
    expect(screen.getByTestId('validation-error')).toHaveTextContent(`after correcting ${badFileName}`)

    const imageFileName = 'anndata.h5ad'
    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: imageFileName,
      content: 'binarystuff' // we'll want to update this if we ever add client-side image file format checks
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))

    expect(screen.getByTestId('file-selection-name')).toHaveTextContent(imageFileName)
    expect(saveButton()).not.toBeDisabled()

    fireEvent.click(saveButton())
    await waitForElementToBeRemoved(() => screen.getByTestId('file-save-spinner'))

    expect(createFileSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      chunkEnd: 11,
      chunkStart: 0,
      fileSize: 11,
      isChunked: false,
      studyAccession: 'SCP1',
      studyFileData: formData
    }))
  })
})
