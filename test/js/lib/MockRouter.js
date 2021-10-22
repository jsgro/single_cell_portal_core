import React, { useState, useRef } from 'react'
import * as ReachRouter from '@reach/router'

/** mocks a reach router to support testing components that use 'navigate'
 * this currently only supports mocking the 'search' part of a url,
 * and so assumes any calls to navigate will just include updates to the query string
 *
 * this mocking works if the component with the useLocation hook is the direct child of this component
 * otherwise, that commponent won't rerender
 */
export default function MockRouter({ children, initialSearch }) {
  const [location, setLocation] = useState(initialSearch)
  const locationSpy = useRef(jest.spyOn(ReachRouter, 'useLocation'))
  const navigateSpy = useRef(jest.spyOn(ReachRouter, 'navigate'))

  /** simulates a navigation event.  assumes newLocation is just a search string, e.g. '?step=foo' */
  function navigate(newLocation) {
    // update the location, which will update the mock useLocation hook on rerender
    setLocation(newLocation)
  }

  navigateSpy.current.mockImplementation(navigate)
  locationSpy.current.mockImplementation(() => ({ search: location }))

  // we need to clone the child and pass the updated location to it, even though
  // the child component should never reference the 'mockLocation' prop.
  // This is necessary to ensure the child re-renders
  return React.cloneElement(children, { mockLocation: location })
}
