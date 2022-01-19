import React, { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/lib/Modal'
import { log } from 'lib/metrics-api'
import _clone from 'lodash/clone'

const functionHolder = {}

/** show a message in a dismissable modal, suitable for showing messages from non-Component parts
  * of the application, or messages simple enough to not warrant the component managing the modal
  * This requires that a MessageModal component be rendered already somewhere on the page
  * @param {String|JSX} message the message content to display
  * @param {String} key a key for deduping multiple errors, and used for logging
  */
export function showMessage(message, key, logProps) {
  functionHolder.showMessage(message, key, logProps)
}

/** take a json-api error object and render a modal with the contents.
 * For now, this just uses the 'detail' field of each error.
 */
export function showJsonApiErrorMessage(error, key, logProps) {
  let message = ''
  if (!error?.errors?.length) {
    // we got a non-json API error, so try to render it as-is
    message = error.toString()
  } else {
    message = <div>
      { error.errors.map((error, index) =>
        <div key={index} className="whitespace-pre-wrap">{error.detail}</div>
      )}
    </div>
  }
  showMessage(message, key, Object.assign(logProps, { jsonApiModal: true }))
}

/** Component to render a modal that can display messages in response to any call to 'showMessage' */
export default function MessageModal() {
  const [show, setShow] = useState(false)
  const [messages, setMessages] = useState({})

  /** helper function to render the message, show the modal, and log the event */
  function showMessage(message, key, logProps) {
    const newMessages = _clone(messages)
    newMessages[key] = message
    setMessages(newMessages)
    setShow(true)
    log('message-modal', { ...logProps, key })
  }

  /** helper function to clear the messages and hide the modal */
  function clearMessages() {
    setMessages({})
    setShow(false)
  }

  /** we have to assign the helper function inside a useEffect so that it is callable from
    * outside the component tree
    */
  useEffect(() => {
    functionHolder.showMessage = showMessage
  })

  if (!show) {
    return <span></span>
  }

  return <Modal
    id='notifier-modal'
    show={show}
    onHide={clearMessages}
    animation={false}>
    <Modal.Body>
      {Object.keys(messages).map(key => {
        return <div className="text-center" key={key}>
          { messages[key] }
        </div>
      })}
    </Modal.Body>
    <Modal.Footer>
      <button className="btn action" onClick={clearMessages}>OK</button>
    </Modal.Footer>
  </Modal>
}
