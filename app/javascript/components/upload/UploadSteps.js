import React from 'react'

import ClusteringForm from './ClusteringForm'
import ImageForm from './ImageForm'


function RawCountsUploadForm() {
  return <span> Raw counts go here</span>
}

function ProcessedExpressionUploadForm() {
  return <span> Processed Expresion here</span>
}



function MetadataUploadForm() {
  return <span>Meta-----data</span>
}

export const STEP_ORDER = ['rawCounts', 'processedExpression', 'metadata', 'clustering', 'images']

export default {
  rawCounts: {
    stepTitle: 'Raw Counts',
    formComponent: RawCountsUploadForm,
    fileFilter: file => file.file_type === 'Expression Matrix' && file.expression_file_info?.is_raw_counts
  },
  processedExpression: {
    stepTitle: 'Processed Expression',
    formComponent: ProcessedExpressionUploadForm,
    fileFilter: file => file.file_type === 'Expression Matrix' && !file.expression_file_info?.is_raw_counts
  },
  metadata: {
    stepTitle: 'Metadata',
    formComponent: MetadataUploadForm,
    fileFilter: file => file.file_type === 'Metadata'
  },
  clustering: {
    stepTitle: 'Clustering',
    formComponent: ClusteringForm,
    fileFilter: file => file.file_type === 'Cluster'
  },
  images: {
    stepTitle: 'Reference Images',
    formComponent: ImageForm,
    fileFilter: file => file.file_type === 'Image'
  }
}
