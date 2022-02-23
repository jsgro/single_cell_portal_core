import React from 'react'
import ReactDOM from 'react-dom'
import ExploreView from '~/components/explore/ExploreView'

import 'react-notifications-component/dist/theme.css'
import '~/styles/application.scss'

// To see this message, add the following to the `<head>` section in your
// views/layouts/application.html.erb
//
//    <%= vite_client_tag %>
//    <%= vite_javascript_tag 'application' %>
console.log('Vite ⚡️ Rails')

// Example: Load Rails libraries in Vite.
//
// import * as Turbo from '@hotwired/turbo'
// Turbo.start()
//
// import ActiveStorage from '@rails/activestorage'
// ActiveStorage.start()
//
// // Import all channels.
// const channels = import.meta.globEager('./**/*_channel.js')


const RENDERABLE_ROOT_COMPONENTS = {
  ExploreView
}

/** helper function to render a component from outside vite/react */
function renderComponent(targetId, componentName, args) {
  ReactDOM.render(React.createElement(RENDERABLE_ROOT_COMPONENTS[componentName], args),
    document.getElementById(targetId))
}
window.SCP.renderComponent = renderComponent

if (window.SCP.componentsToRender?.length) {
  window.SCP.componentsToRender.forEach(params => {
    renderComponent(params.targetId, params.componentName, params.args)
  })
}
