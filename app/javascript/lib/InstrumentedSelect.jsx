import React, { useRef } from 'react'
import Select from 'react-select'
import { log, getLabelTextForElement } from '~/lib/metrics-api'
/**
 * Thin wrapper around react-select that sends menu:change events
 * props are passed through to the underlying select component
 * */
export default function InstrumentedSelect(props) {
  const selectElement = useRef(null)
  const parentChangeHandler = props.onChange
  /** wraps the parent change handler function in a log call */
  function handleChange(opt, action) {
    let label = ''
    const selectEl = selectElement?.current?.select?.controlRef?.parentNode
    if (selectEl) {
      label = getLabelTextForElement(selectEl, true)
    }
    log('menu:change', {
      value: opt?.label || opt?.name || opt?.value,
      action: action.action,
      label,
      text: props['data-analytics-name'] || props['name']
    })
    if (parentChangeHandler) {
      parentChangeHandler(opt, action)
    }
  }

  return <Select {...props} onChange={handleChange} ref={selectElement}/>
}

