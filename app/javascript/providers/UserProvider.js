import React, { useContext, useState } from 'react'
import $ from 'jquery'

import { updateCurrentUser } from 'lib/scp-api'

// window.SCP is not available when running via Jest tests,
// so default such cases to a string "test"
export const accessToken = ('SCP' in window) ? window.SCP.userAccessToken : 'test' // eslint-disable-line max-len

export function getAllFlags() {
  // for now, read it off the home page.  Eventually, this will want to be an API call
  let flags = {}
  const pageFlagElement = $('#feature-flags')
  if (pageFlagElement.length) {
    flags = JSON.parse(pageFlagElement.attr('value'))
  }
  return flags
}

const defaultUserState = {
  accessToken,
  isAnonymous: !accessToken,
  featureFlagsWithDefaults: null,
  updateFlags: () => {
    throw new Error(
      'You are trying to use this context outside of a Provider container'
    )
  }
}

export const UserContext = React.createContext(defaultUserState)

export default function UserProvider({ user, children }) {
  const [userState, setUserState] = useState(user ? user : defaultUserState)

  userState.updateFeatureFlags = updateFeatureFlags
  userState.accessToken = accessToken
  userState.isAnonymous = !accessToken
  userState.featureFlagsWithDefaults = userState.featureFlagsWithDefaults ? userState.featureFlagsWithDefaults : getAllFlags()

  async function updateFeatureFlags(updatedFlags) {
    const mergedFlags = Object.assign({}, userState.featureFlagsWithDefaults, updatedFlags)
    const updatedUser = Object.assign({}, userState)
    updatedUser.featureFlagsWithDefaults = mergedFlags
    setUserState(updatedUser)
    // Note that we do NOT await the result of the server-side update
    // we want the UI to be able to change quickly in repsonse to a feature flag change, and
    // we assume changes will be successful (and it's not a big problem if they are not)
    updateCurrentUser({feature_flags: updatedFlags})
  }
  return (
    <UserContext.Provider value={userState}>
      { children }
    </UserContext.Provider>
  )
}
