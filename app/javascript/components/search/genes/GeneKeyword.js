import React, { useContext, useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faSearch } from '@fortawesome/free-solid-svg-icons'
import _clone from 'lodash/clone'
import Button from 'react-bootstrap/lib/Button'
import Modal from 'react-bootstrap/lib/Modal'
import CreatableSelect from 'react-select/creatable';

import { GeneSearchContext } from 'providers/GeneSearchProvider'
import { StudySearchContext } from 'providers/StudySearchProvider'

/** renders the gene text input
  * This is split into its own component both for modularity, and also because
  * having it inlined in GeneSearchView led to a mysterious infinite-repaint bug in StudyResults
  */
export default function GeneKeyword({ placeholder, helpTextContent }) {
  const geneSearchState = useContext(GeneSearchContext)
  const studySearchState = useContext(StudySearchContext)
  let geneParamAsArray = []
  if (geneSearchState.params.genes) {
    geneParamAsArray = geneSearchState.params.genes.split(' ').map((geneName) => ({
        label: geneName,
        value: geneName
    }))
  }

  /** the search control tracks two state variables
    * an array of already entered genes (geneArray),
    * and the current text the user is typing (inputText) */
  const [geneArray, setGeneArray] = useState(geneParamAsArray)
  const [inputText, setInputText] = useState('')

  const [showEmptySearchModal, setShowEmptySearchModal] = useState(false)

  const inputField = useRef()

  /** handles a user submitting a gene search */
  function handleSubmit(event) {
    event.preventDefault()
    const newGeneArray = syncGeneArrayToInputText()
    if (newGeneArray && newGeneArray.length) {
      geneSearchState.updateSearch(
        // flatten the gene array back to a space-delimited string
        { genes: newGeneArray.map((g) => g.value).join(' ') },
        studySearchState
      )
    } else {
      setShowEmptySearchModal(true)
    }
  }

  // Converts any current typed free text to a gene array entry
  function syncGeneArrayToInputText() {
    if (!inputText) {
      return geneArray;
    }
    const newGeneArray = [...geneArray, {label: inputText, value: inputText}]
    setInputText('')
    setGeneArray(newGeneArray)
    return newGeneArray
  }

  // detects presses of the space bar to create a new gene chunk
  function handleKeyDown(event) {
    if (!inputText) return;
    switch (event.key) {
      case ' ':
        newGeneArray = syncGeneArrayToInputText()
    }
  };

  return (
    <form className="gene-keyword-search form-horizontal" onSubmit={handleSubmit}>
      <div className="input-group">
        <CreatableSelect
          components={{DropdownIndicator: null}}
          inputValue={inputText}
          value={geneArray}
          className="gene-keyword-search-input"
          isClearable
          isMulti
          menuIsOpen={false}
          onChange={(value) => setGeneArray(value ? value : [])}
          onInputChange={(inputValue) => setInputText(inputValue)}
          onKeyDown={handleKeyDown}
          // the default blur behavior removes any entered free text,
          // we want to instead auto-convert entered free text to a gene tag
          onBlur={syncGeneArrayToInputText}
          placeholder={placeholder}
        />
        <div className="input-group-append">
          <Button type="submit">
            <FontAwesomeIcon icon={faSearch} />
          </Button>
        </div>
      </div>

      <Modal
        show={showEmptySearchModal}
        onHide={() => {setShowEmptySearchModal(false)}}
        animation={false}
        bsSize='small'>
        <Modal.Body className="text-center">
          You must enter at least one gene to search
        </Modal.Body>
      </Modal>
    </form>
  )
}
