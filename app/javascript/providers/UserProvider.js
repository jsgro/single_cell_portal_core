import React, { useState } from 'react'
import $ from 'jquery'

import { updateCurrentUser } from 'lib/scp-api'


/**
  * Returns the current access token for the user
  * window.SCP is not available when running via Jest tests,
  * so default such cases to a string "test"
  */
export function getAccessToken() {
  return ('SCP' in window) ? window.SCP.userAccessToken : 'test'
}

/** Returns the feature flags with defaults for the current user */
export function getFeatureFlagsWithDefaults() {
  // for now, read it off the home page.  Eventually, this will want to be an API call
  let flags = {}
  const pageFlagElement = $('#feature-flags')
  if (pageFlagElement.length) {
    flags = JSON.parse(pageFlagElement.attr('value'))
  }
  return flags
}

const defaultUserState = {
  accessToken: null,
  isAnonymous: true,
  featureFlagsWithDefaults: null,
  updateFlags: () => {
    throw new Error(
      'You are trying to use this context outside of a Provider container'
    )
  }
}

/** current user object context */
export const UserContext = React.createContext(defaultUserState)


/** Provider for the current user object.
  * this also exports plain JS methods for getting the token and flags,
  * since those may need to be accessible outside of React component rendering
  * e.g. in metrics-api
  */
export default function UserProvider({ user, children }) {
  const [userState, setUserState] = useState(user ? user : defaultUserState)

  userState.updateFeatureFlags = updateFeatureFlags
  userState.accessToken = getAccessToken()
  userState.isAnonymous = !userState.accessToken
  userState.featureFlagsWithDefaults = userState.featureFlagsWithDefaults ? userState.featureFlagsWithDefaults : getFeatureFlagsWithDefaults()

  async function updateFeatureFlags(updatedFlags) {
    const mergedFlags = Object.assign({}, userState.featureFlagsWithDefaults, updatedFlags)
    const updatedUser = Object.assign({}, userState)
    updatedUser.featureFlagsWithDefaults = mergedFlags
    setUserState(updatedUser)
    // Note that we do NOT await the result of the server-side update
    // we want the UI to be able to change quickly in repsonse to a feature flag change, and
    // we assume changes will be successful (and it's not a big problem if they are not)
    updateCurrentUser({ feature_flags: updatedFlags })
  }
  return (
    <UserContext.Provider value={userState}>
      { children }
    </UserContext.Provider>
  )
}
