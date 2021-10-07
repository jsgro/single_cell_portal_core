import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import FileUploadControl from 'components/upload/FileUploadControl'

/** simulates a user selecting a file with the given information
 *  returns the js File object created */
export function fireFileSelectionEvent(node, { fileName, content='text stuff', contentType='text/plain' }) {
  const selectedFile = new File([content], fileName, { type: contentType })
  fireEvent.change(node, { target: { files: [selectedFile] } })
  return selectedFile
}

describe('file upload control defaults the name of the file', () => {
  it('updates the name of the selected file', async () => {
    const file = {
      _id: '123',
      name: '',
      status: 'new',
      file_type: 'Other'
    }
    const updateFileHolder = {
      updateFile: () => {}
    }
    const updateFileSpy = jest.spyOn(updateFileHolder, 'updateFile')

    render((
      <FileUploadControl
        file={file}
        updateFile={updateFileHolder.updateFile}
        allowedFileTypes={['.txt']}
        validationMessages={{}}/>
    ))

    expect(screen.getByRole('button')).toHaveTextContent('Choose file')
    expect(screen.queryByTestId('file-name-validation')).toBeNull()

    const fileObj = fireFileSelectionEvent(screen.getByTestId('file-input'), { fileName: 'cluster.txt' })
    expect(updateFileSpy).toHaveBeenLastCalledWith('123', { uploadSelection: fileObj, name: 'cluster.txt' })
  })
})
