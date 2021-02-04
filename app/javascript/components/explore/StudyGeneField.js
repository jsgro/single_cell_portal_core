import React, { useContext, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import Button from 'react-bootstrap/lib/Button'
import Modal from 'react-bootstrap/lib/Modal'
import CreatableSelect from 'react-select/creatable'

/** renders the gene text input
  * This is split into its own component both for modularity, and also because
  * having it inlined in GeneSearchView led to a mysterious infinite-repaint bug in StudyResults
  */
export default function StudyGeneField({ genes, setGenes, allGenes }) {
  const [inputText, setInputText] = useState('')

  let geneOptions = []
  if (allGenes && inputText && inputText.length > 1) {
    const lowerCaseInput = inputText.toLowerCase()
    geneOptions = allGenes.filter(geneName => {
      return geneName.toLowerCase().includes(lowerCaseInput)
    }).map(geneName => ({
      label: geneName,
      value: geneName
    }))
  }

  let enteredGeneArray = []
  if (genes) {
    enteredGeneArray = genes.split(' ').map(geneName => ({
      label: geneName,
      value: geneName
    }))
  }

  /** the search control tracks two state variables
    * an array of already entered genes (geneArray),
    * and the current text the user is typing (inputText) */
  const [geneArray, setGeneArray] = useState(enteredGeneArray)


  const [showEmptySearchModal, setShowEmptySearchModal] = useState(false)

  /** handles a user submitting a gene search */
  function handleSubmit(event) {
    event.preventDefault()
    const newGeneArray = syncGeneArrayToInputText()
    if (newGeneArray && newGeneArray.length) {
      setGenes(newGeneArray.map(g => g.value).join(' '))
    } else {
      setShowEmptySearchModal(true)
    }
  }

  /** Converts any current typed free text to a gene array entry */
  function syncGeneArrayToInputText() {
    const inputTextTrimmed = inputText.trim().replace(/,/g, '')
    if (!inputTextTrimmed) {
      return geneArray
    }
    const newGeneArray = [...geneArray, { label: inputTextTrimmed, value: inputTextTrimmed }]

    setInputText(' ')
    setGeneArray(newGeneArray)
    return newGeneArray
  }

  /** detects presses of the space bar to create a new gene chunk */
  function handleKeyDown(event) {
    if (!inputText) {
      return
    }
    switch (event.key) {
      case ' ':
      case ',':
        syncGeneArrayToInputText()
        setTimeout(() => {setInputText(' ')}, 0)
    }
  }

  return (
    <form className="gene-keyword-search form-horizontal" onSubmit={handleSubmit}>
      <div className="input-group">
        <CreatableSelect
          components={{ DropdownIndicator: null }}
          inputValue={inputText}
          value={geneArray}
          className="gene-keyword-search-input"
          isClearable
          isMulti
          isValidNewOption={() => false}
          noOptionsMessage={() => (inputText.length > 1 ? 'No matching genes' : 'type to search...')}
          options={geneOptions}
          onChange={value => setGeneArray(value ? value : [])}
          onInputChange={inputValue => setInputText(inputValue)}
          onKeyDown={handleKeyDown}
          // the default blur behavior removes any entered free text,
          // we want to instead auto-convert entered free text to a gene tag
          onBlur={syncGeneArrayToInputText}
          placeholder={'Genes (e.g. "PTEN NF2")'}
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
