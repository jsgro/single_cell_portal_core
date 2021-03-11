import React, { useContext, useState, useEffect } from 'react'
import { StudySearchContext, hasSearchParams } from './StudySearchProvider'

import { fetchDownloadSize } from 'lib/scp-api'

export const DownloadContext = React.createContext({
  searchResults: {},
  downloadSize: {}
})


/** Provides loading status and fetched data for Bulk Download components */
export default function DownloadProvider({ children }) {
  const studyContext = useContext(StudySearchContext)

  const [downloadState, setDownloadState] = useState({
    downloadSize: {},
    isLoaded: false
  })

  /** Update size preview for bulk download */
  async function updateDownloadSize(results) {
    const accessions = results.matchingAccessions
    const fileTypes = ['Expression', 'Metadata']
    const size = await fetchDownloadSize(accessions, fileTypes)

    setDownloadState({
      isLoaded: true,
      downloadSize: size
    })
  }

  // Update the size if results are loaded and the accession list has changed
  let currentAccessions = []
  if (studyContext?.results?.matchingAccessions) {
    currentAccessions = studyContext.results.matchingAccessions
  }
  useEffect(() => {
    if (!studyContext.isLoading && studyContext.isLoaded && hasSearchParams(studyContext.params)) {
      updateDownloadSize(studyContext.results)
    }
  }, [currentAccessions.join(',')])

  return (
    <DownloadContext.Provider value={downloadState}>
      { children }
    </DownloadContext.Provider>
  )
}
