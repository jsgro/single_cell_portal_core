import React from 'react'
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import _cloneDeep from 'lodash/cloneDeep'
import ReactNotification from 'react-notifications-component'

import MockRouter from '../lib/MockRouter'
import { UserContext } from 'providers/UserProvider'
import { RawUploadWizard } from 'components/upload/UploadWizard'
import * as ScpApi from 'lib/scp-api'
import { EMPTY_STUDY } from './file-info-responses'

/** gets a pointer to the react-select node based on label text
 * This is non-trivial since our labels contain the select,
 * and so a naive getByLabelText will not work.
 * Instead we get the label using getByText and assume
 * the first div inside is the react-select element */
export function getSelectByLabelText(screen, text) {
  return screen.getByText(text).querySelector('div')
}

/** renders the upload wizard with the given studyInfo response, and waits for the loading
 * spinner to clear
*/
export async function renderWizardWithStudy({
  studyInfo=EMPTY_STUDY, featureFlags={}, studyAccession='SCP1', studyName='Chickens'
}) {
  const studyInfoSpy = jest.spyOn(ScpApi, 'fetchStudyFileInfo')
  // pass in a clone of the response since it may get modified by the cache operations
  studyInfoSpy.mockImplementation(params => {
    const response = _cloneDeep(studyInfo)
    return Promise.resolve(response)
  })

  const renderResult = render(
    <UserContext.Provider value={{ featureFlagsWithDefaults: featureFlags }}>
      <ReactNotification/>
      <MockRouter>
        <RawUploadWizard studyAccession={studyAccession} name={studyName}/>
      </MockRouter>
    </UserContext.Provider>)
  await waitForElementToBeRemoved(() => screen.getByTestId('upload-wizard-spinner'))

  return renderResult
}

/** gets the current save button */
export function saveButton() {
  return screen.getByTestId('file-save')
}
