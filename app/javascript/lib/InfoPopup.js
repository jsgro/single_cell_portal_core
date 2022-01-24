import React from 'react'
import { Popover, OverlayTrigger } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'
/**
 * thin wrapper around OverlayTrigger and Popover to render popup help content
 * popup will work even when underlying element is disabled.
 * All arguments are passed through to either Popover or OverlayTrigger
*/
export default function InfoPopup({
  content, // the content of the popover
  target=<FontAwesomeIcon icon={faQuestionCircle} className="action help-icon"/>, // the element to attach the popover to
  trigger=['click'], // what actions trigger the popup, for hover tips, use ['hover', 'focus']
  placement='top',
  className='tooltip-wide',
  dataAnalyticsName='info-popup', // clicks on the target will be logged, with this as the 'text' sent to Mixpanel
  id // needs to have a unique id for popover to render. if none is provided, a default unique string will be made
}) {
  id = id || _uniqueId('help-popup-')
  const popoverContent = <Popover id={id} className={className}>
    {content}
  </Popover>
  return <OverlayTrigger rootClose trigger={trigger} placement={placement} overlay={popoverContent}>
    <span className="log-click" data-analytics-name={dataAnalyticsName}>{target}</span>
  </OverlayTrigger>
}
