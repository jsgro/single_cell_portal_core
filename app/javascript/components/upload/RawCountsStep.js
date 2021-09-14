import React from 'react'

export default {
  title: 'Raw Counts',
  name: 'rawCounts',
  component: RawCountsUploadForm,
  fileFilter: file => file.file_type === 'Expression Matrix' && file.expression_file_info?.is_raw_counts
}

/** placeholder */
function RawCountsUploadForm() {
  return <span> Raw counts go here</span>
}
