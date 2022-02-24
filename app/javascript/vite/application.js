import React from 'react'
import ReactDOM from 'react-dom'
import HomePageContent from '../components/HomePageContent'
import ExploreView from '../components/explore/ExploreView'

import 'react-notifications-component/dist/theme.css'
import '~/styles/application.scss'

console.log('Vite ⚡️ Rails')

const entryPoints = [
  { elementId: 'home-page-content', component: HomePageContent },
  { elementId: 'study-visualize', component: ExploreView }

]

entryPoints.forEach(entryPoint => {
  if (document.getElementById(entryPoint.elementId)) {
    ReactDOM.render(
      React.createElement(HomePageContent, {
        studyAccession: window.SCP.studyAccession
      }), document.getElementById(entryPoint.elementId)
    )
  }
})


