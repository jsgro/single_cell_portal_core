import React from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'

/** show dna spinning indicator */
export default function LoadingSpinner(props) {
  return <FontAwesomeIcon icon={faDna} className="gene-load-spinner" {...props}/>
}
