import React from 'react'

import HomePageContentLegacy from './HomePageContentLegacy'
import HomePageContentXds from './HomePageContentXds'
import { getFeatureFlagsWithDefaults } from 'providers/UserProvider'

/** Until refactor is done, this merely sets appropriate component */
export default function HomePageContent() {
  const flags = getFeatureFlagsWithDefaults()
  if (flags.cross_dataset_search_frontend) {
    return (<HomePageContentXds />)
  } else {
    return (<HomePageContentLegacy />)
  }
}
