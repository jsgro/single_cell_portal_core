import React from 'react'

export default {
  title: 'Processed Expression',
  name: 'processedExpression',
  component: ProcessedExpressionUploadForm,
  fileFilter: file => file.file_type === 'Expression Matrix' && !file.expression_file_info?.is_raw_counts
}


/** placeholder */
function ProcessedExpressionUploadForm() {
  return <span> Processed Expresion here</span>
}
