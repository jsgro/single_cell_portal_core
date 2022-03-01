import React from 'react'
import ReactDOM from 'react-dom'
import 'react-notifications-component/dist/theme.css'
import morpheus from 'morpheus-app'
import { Spinner } from 'spin.js'

import '~/styles/application.scss'
import HomePageContent from '~/components/HomePageContent'
import ExploreView from '~/components/explore/ExploreView'
import UploadWizard from '~/components/upload/UploadWizard'
import ValidationMessage from '~/components/validation/ValidationMessage'
import ClusterAssociationSelect from '~/components/upload/ClusterAssociationSelect'
import RawAssociationSelect from '~/components/upload/RawAssociationSelect'
import { validateFileContent } from '~/lib/validation/validate-file-content'
import { getFeatureFlagsWithDefaults } from '~/providers/UserProvider'
import checkMissingAuthToken from '~/lib/user-auth-tokens'
import { validateRemoteFileContent } from '~/lib/validation/validate-remote-file-content'
import {
  logPageView, logClick, logMenuChange, setupPageTransitionLog, log, logCopy, logContextMenu
} from '~/lib/metrics-api'
import * as ScpApi from '~/lib/scp-api'

window.SCP = window.SCP ? window.SCP : {}

document.addEventListener('DOMContentLoaded', () => {
  // Logs only page views for faceted search UI
  logPageView()

  $(document).on('click', 'body', logClick)
  $(document).on('change', 'select', logMenuChange)
  $(document).on('copy', 'body', logCopy)
  // contextmenu event is to handle when users use context menu "copy email address" instead of cmd+C copy event as
  // this does not emit the copy event
  $(document).on('contextmenu', 'body', logContextMenu)

  setupPageTransitionLog()

  checkMissingAuthToken()
})

const componentsToExport = {
  HomePageContent, ExploreView, UploadWizard, ValidationMessage, ClusterAssociationSelect, RawAssociationSelect
}

/** helper to render React components from non-react portions of the app
 * @param {String|Element} target - the html element to render on, can be either an element or an id
 * @param {String} componentName - the component to render -- must be included in the `componentsToExport` above
 * @param {Object} props - the props to pass to the component
*/
function renderComponent(target, componentName, props) {
  let targetEl = target
  if (typeof target === 'string' || target instanceof String) {
    targetEl = document.getElementById(target)
  }
  ReactDOM.unmountComponentAtNode(targetEl)
  ReactDOM.render(React.createElement(componentsToExport[componentName], props),
    targetEl)
}

// SCP expects these variables to be global.
//
// If adding a new variable here, also add it to .eslintrc.js


/** put the function globally accessible, replacing the pre-registration 'renderComponent'
 * setup in assets/application.js */
window.SCP.renderComponent = renderComponent

/** render any components that were registered to render prior to this script loading */
window.SCP.componentsToRender.forEach(componentToRender => {
  renderComponent(componentToRender.target, componentToRender.componentName, componentToRender.props)
})

window.SCP.log = log
window.SCP.getFeatureFlagsWithDefaults = getFeatureFlagsWithDefaults
window.SCP.validateFileContent = validateFileContent
window.SCP.validateRemoteFileContent = validateRemoteFileContent
window.SCP.API = ScpApi

window.Spinner = Spinner
window.morpheus = morpheus
