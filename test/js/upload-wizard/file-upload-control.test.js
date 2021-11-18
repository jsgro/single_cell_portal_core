import React from 'react'
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import FileUploadControl from 'components/upload/FileUploadControl'
import { fireFileSelectionEvent } from '../lib/file-mock-utils'


describe('file upload control defaults the name of the file', () => {
  afterEach(() => {
    // Restores all mocks back to their original value
    jest.restoreAllMocks()
  })

  it('updates the name of the selected file', async () => {
    const file = {
      _id: '123',
      name: '',
      status: 'new',
      file_type: 'Other'
    }
    const updateFileHolder = { updateFile: () => {} }
    const updateFileSpy = jest.spyOn(updateFileHolder, 'updateFile')

    render(<FileUploadControl
      file={file}
      allFiles={[file]}
      updateFile={updateFileHolder.updateFile}
      allowedFileExts={['.txt']}
      validationMessages={{}}/>)

    expect(screen.getByRole('button')).toHaveTextContent('Choose file')
    expect(screen.queryByTestId('file-name-validation')).toBeNull()

    const fileObj = fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: 'cluster.txt',
      content: 'NAME,X,Y\nTYPE,numeric,numeric\nCell1,1,0\n'
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
    expect(updateFileSpy).toHaveBeenLastCalledWith('123', {
      uploadSelection: fileObj,
      name: 'cluster.txt',
      upload_file_name: 'cluster.txt'
    })
  })
})

describe('file upload control validates the selected file', () => {
  it('validates the extension', async () => {
    const file = {
      _id: '123',
      name: '',
      status: 'new',
      file_type: 'Other'
    }

    const updateFileHolder = { updateFile: () => {} }
    const updateFileSpy = jest.spyOn(updateFileHolder, 'updateFile')

    render((
      <FileUploadControl
        file={file}
        allFiles={[file]}
        updateFile={updateFileHolder.updateFile}
        allowedFileExts={['.txt']}
        validationMessages={{}}/>
    ))

    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: 'cluster.foo',
      content: 'NAME,X,Y\nTYPE,numeric,numeric\nCell1,1,0\n'
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
    expect(updateFileSpy).toHaveBeenCalledTimes(0)
    expect(screen.getByTestId('file-content-validation')).toHaveTextContent('Could not use cluster.foo')
    expect(screen.getByTestId('file-content-validation')).toHaveTextContent('Allowed extensions are .txt')
  })

  it('validates the name uniqueness', async () => {
    const file = {
      _id: '123',
      name: '',
      status: 'new',
      file_type: 'Other'
    }

    const otherFile = {
      _id: '567',
      name: 'cluster.txt'
    }

    const updateFileHolder = { updateFile: () => {} }
    const updateFileSpy = jest.spyOn(updateFileHolder, 'updateFile')

    render((
      <FileUploadControl
        file={file}
        allFiles={[file, otherFile]}
        updateFile={updateFileHolder.updateFile}
        allowedFileExts={['.txt']}
        validationMessages={{}}/>
    ))

    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: 'cluster.txt',
      content: 'NAME,X,Y\nTYPE,numeric,numeric\nCell1,1,0\n'
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
    expect(updateFileSpy).toHaveBeenCalledTimes(0)
    expect(screen.getByTestId('file-content-validation')).toHaveTextContent('Could not use cluster.txt')
    expect(screen.getByTestId('file-content-validation'))
      .toHaveTextContent('A file named cluster.txt already exists in your study')
  })

  it('validates the name uniqueness across upload selections', async () => {
    const file = {
      _id: '123',
      name: '',
      status: 'new',
      file_type: 'Other'
    }

    const otherFile = {
      _id: '567',
      uploadSelection: { name: 'cluster1.txt' }
    }

    const updateFileHolder = { updateFile: () => {} }
    const updateFileSpy = jest.spyOn(updateFileHolder, 'updateFile')

    render((
      <FileUploadControl
        file={file}
        allFiles={[file, otherFile]}
        updateFile={updateFileHolder.updateFile}
        allowedFileExts={['.txt']}
        validationMessages={{}}/>
    ))

    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: 'cluster1.txt',
      content: 'NAME,X,Y\nTYPE,numeric,numeric\nCell1,1,0\n'
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
    expect(updateFileSpy).toHaveBeenCalledTimes(0)
    expect(screen.getByTestId('file-content-validation'))
      .toHaveTextContent('A file named cluster1.txt already exists in your study')
  })

  it('validates the content', async () => {
    const file = {
      _id: '123',
      name: '',
      status: 'new',
      file_type: 'Cluster'
    }

    const updateFileHolder = { updateFile: () => {} }
    const updateFileSpy = jest.spyOn(updateFileHolder, 'updateFile')

    render((
      <FileUploadControl
        file={file}
        allFiles={[file]}
        updateFile={updateFileHolder.updateFile}
        allowedFileExts={['.txt']}
        validationMessages={{}}/>
    ))

    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: 'cluster.txt',
      content: 'notNAME,X,Y\nTYPE,numeric,numeric\nCell1,1,0\n'
    }, true)
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
    expect(updateFileSpy).toHaveBeenCalledTimes(0)
    expect(screen.getByTestId('file-content-validation')).toHaveTextContent('Could not use cluster.txt')
    expect(screen.getByTestId('file-content-validation'))
      .toHaveTextContent('First row, first column must be "NAME" (case insensitive). Your value was "notNAME')
  })

  it('renders multiple content errors', async () => {
    const file = {
      _id: '123',
      name: '',
      status: 'new',
      file_type: 'Cluster'
    }

    const updateFileHolder = { updateFile: () => {} }
    const updateFileSpy = jest.spyOn(updateFileHolder, 'updateFile')

    render((
      <FileUploadControl
        file={file}
        allFiles={[file]}
        updateFile={updateFileHolder.updateFile}
        allowedFileExts={['.txt']}
        validationMessages={{}}/>
    ))

    fireFileSelectionEvent(screen.getByTestId('file-input'), {
      fileName: 'cluster.txt',
      content: 'notNAME,X,Y\nfoo,numeric,numeric\nCell1,1,0\n'
    })
    await waitForElementToBeRemoved(() => screen.getByTestId('file-validation-spinner'))
    expect(updateFileSpy).toHaveBeenCalledTimes(0)
    expect(screen.getByTestId('file-content-validation')).toHaveTextContent('Could not use cluster.txt')
    expect(screen.getByTestId('file-content-validation'))
      .toHaveTextContent('First row, first column must be "NAME" (case insensitive). Your value was "notNAME')
    expect(screen.getByTestId('file-content-validation'))
      .toHaveTextContent('Second row, first column must be "TYPE" (case insensitive). Your value was "foo"')
  })
})
