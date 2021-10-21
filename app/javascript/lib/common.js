/**  */
import React from 'react'
import { Popover, OverlayTrigger } from 'react-bootstrap'


/** takes a button element and wraps in a tooltip that will work for a disabled button as well*/
export function wrapButtonWithTooltip(hint, wrappedButton, idText, position = 'top') {
  const popoverText = <Popover id={idText} className="tooltip-wide" style={{
    'background-color': 'black',
    'color': '#fff',
    'text-align': 'center',
    'margin': 0,
    'padding': 0
  }}> { hint } </Popover>
  wrappedButton = <OverlayTrigger trigger={['hover', 'focus']} rootClose placement={position} overlay={popoverText}>
    <div className="float-right">{ wrappedButton }</div>
  </OverlayTrigger>
  return wrappedButton
}
