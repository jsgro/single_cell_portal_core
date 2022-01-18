import React, { useContext, useRef, useState } from 'react'
import Button from 'react-bootstrap/lib/Button'
import InputGroup from 'react-bootstrap/lib/InputGroup'
import Form from 'react-bootstrap/lib/Form'
import { faQuestionCircle, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SearchSelectionContext } from 'providers/SearchSelectionProvider'
import Modal from 'react-bootstrap/lib/Modal'
import { closeModal } from 'components/search/controls/SearchPanel'

/**
 * Component to search using a keyword value
 * optionally takes a 'keywordValue' prop with the initial value for the field
 */
export default function KeywordSearch({ keywordPrompt }) {
  const placeholder = keywordPrompt ? keywordPrompt : 'Search title and description text'
  const selectionContext = useContext(SearchSelectionContext)
  // show clear button after a search has been done,
  //  as long as the text hasn't been updated
  const showClear = selectionContext.terms && selectionContext.terms.length
  const inputField = useRef()
  const [showTextSearchHelpModal, setTextShowSearchHelpModal] = useState(false)

  const textSearchModalContent = (<div>
    <h4 className="text-center">Title and description Search</h4><br/>
    Using the search box below will perform a text-based search of all study titles and descriptions, and will return
    those that contain any of the specified terms. You can quote (&quot;) phrases to find matches that contain the entire
    phrase, and you can combine both single terms and quoted phrases in your search.
  </div>)

  const textSearchLink = <a className="action advanced-opts"
                            onClick={() => setTextShowSearchHelpModal(true)}
                            data-analytics-name="search-help">
    <FontAwesomeIcon icon={faQuestionCircle} />
  </a>

  /**
   * Updates terms in search context upon submitting keyword search
   */
  function handleSubmit(event) {
    event.preventDefault()
    selectionContext.performSearch()
  }

  /** handle typing in the search box */
  function handleKeywordChange(newValue) {
    selectionContext.updateSelection({ terms: newValue })
  }

  /** handle a user pressing the 'x' to clear the field */
  function handleClear() {
    inputField.current.focus()
    selectionContext.updateSelection({ terms: '' }, true)
  }

  return (
    <Form
      horizontal
      onSubmit = {handleSubmit}
      className='study-keyword-search'
    >
      <span className='badge text-search search-title'>
        Description search {textSearchLink}
      </span>
      <InputGroup>
        <input
          ref = {inputField}
          className="form-control"
          size="30"
          type="text"
          value={selectionContext.terms}
          onChange={e => handleKeywordChange(e.target.value)}
          placeholder={placeholder}
          name="keywordText"/>
        <div className="input-group-append">
          <Button type='submit'>
            <FontAwesomeIcon icon={faSearch} />
          </Button>
        </div>
        { showClear &&
          <Button className="keyword-clear"
            type='button'
            onClick={handleClear} >
            <FontAwesomeIcon icon={faTimes} />
          </Button> }
      </InputGroup>
      <Modal
        show={showTextSearchHelpModal}
        onHide={() => closeModal(setTextShowSearchHelpModal)}
        animation={false}
        bsSize='large'>
        <Modal.Body className="">
          { textSearchModalContent }
        </Modal.Body>
      </Modal>
    </Form>
  )
}
