/* eslint no-console:0 */
/*
 * This file is automatically compiled by Webpack, along with any other files
 * present in this directory. You're encouraged to place your actual
 * application logic in a relevant structure within app/javascript and only
 * use these pack files to reference that code so it'll be compiled.
 *
 * To reference this file, add <%= javascript_pack_tag 'application' %> to
 * the appropriate layout file, like app/views/layouts/application.html.erb
 */
import 'react-notifications-component/dist/theme.css'
import 'styles/application.scss'

import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'
import { Spinner } from 'spin.js'
import 'jquery-ui/ui/widgets/autocomplete'
import 'jquery-ui/ui/widgets/sortable'
import 'jquery-ui/ui/widgets/dialog'
import 'jquery-ui/ui/effects/effect-highlight'
import morpheus from 'morpheus-app'

import checkMissingAuthToken from 'lib/user-auth-tokens'
// Below import resolves to '/app/javascript/components/HomePageContent.js'
import HomePageContent from 'components/HomePageContent'
import {
  logPageView, logClick, logMenuChange, setupPageTransitionLog, log, logCopy, logContextMenu
} from 'lib/metrics-api'
import * as ScpApi from 'lib/scp-api'
import { getFeatureFlagsWithDefaults } from 'providers/UserProvider'
import {
  validateFileContent, validateRemoteFileContent
} from 'lib/validation/validate-file-content'
import { renderValidationAlert } from 'components/validation/ValidationAlert'
import { renderClusterAssociationSelect } from 'components/upload/ClusterAssociationSelect'
import { renderUploadWizard } from 'components/upload/UploadWizard'
import { renderRawAssociationSelect } from 'components/upload/RawAssociationSelect'
import { renderExploreView } from 'components/explore/ExploreView'

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

  if (document.getElementById('home-page-content')) {
    ReactDOM.render(
      <HomePageContent />, document.getElementById('home-page-content')
    )
  }

  checkMissingAuthToken()
})


window.SCP = window.SCP ? window.SCP : {}
// SCP expects these variables to be global.
//
// If adding a new variable here, also add it to .eslintrc.js
window.$ = $
window.jQuery = $
window.Spinner = Spinner
window.morpheus = morpheus

window.SCP.log = log
window.SCP.API = ScpApi
window.SCP.renderClusterAssociationSelect = renderClusterAssociationSelect
window.SCP.renderRawAssociationSelect = renderRawAssociationSelect
window.SCP.renderExploreView = renderExploreView
window.SCP.getFeatureFlagsWithDefaults = getFeatureFlagsWithDefaults
window.SCP.renderValidationAlert = renderValidationAlert
window.SCP.validateFileContent = validateFileContent
window.SCP.validateRemoteFileContent = validateRemoteFileContent
window.SCP.renderUploadWizard = renderUploadWizard
