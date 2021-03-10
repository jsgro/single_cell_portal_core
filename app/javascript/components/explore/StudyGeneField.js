import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faFileUpload } from '@fortawesome/free-solid-svg-icons'
import Button from 'react-bootstrap/lib/Button'
import Modal from 'react-bootstrap/lib/Modal'
import CreatableSelect from 'react-select/creatable'


/** renders the gene text input
  * This shares a lot of logic with search/genes/GeneKeyword, but is kept as a separate component for
  * now, as the need for autocomplete raises additional complexity
  */
export default function StudyGeneField({ genes, searchGenes, allGenes }) {
  const [inputText, setInputText] = useState('')

  let geneOptions = []
  if (allGenes) {
    // Autocomplete when user starts typing
    if (inputText && inputText.length > 0) {
      const lowerCaseInput = inputText.toLowerCase()
      geneOptions = allGenes.filter(geneName => {
        return geneName.toLowerCase().includes(lowerCaseInput)
      }).map(geneName => ({
        label: geneName,
        value: geneName
      }))
    }
  }

  let enteredGeneArray = []
  if (genes) {
    enteredGeneArray = getOptionsFromGenes(genes)
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
      if (!event) {event = { type: 'clear' }}
      searchGenes(newGeneArray.map(g => g.value), event.type)
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

  /** handles a user selecting a gene list file to use */
  function readGeneListFile(file) {
    const fileReader = new FileReader()
    fileReader.onloadend = () => {
      const newGenes = fileReader.result.trim().split(/[\s,]+/)
      searchGenes(newGenes)
    }
    fileReader.readAsText(file)
  }

  useEffect(() => {
    if (genes.join(',') !== geneArray.map(opt => opt.label).join(',')) {
      // the genes have been updated elsewhere -- resync
      setGeneArray(getOptionsFromGenes(genes))
      setInputText('')
    }
  }, [genes.join(',')])

  return (
    <form className="gene-keyword-search gene-study-keyword-search form-horizontal" onSubmit={handleSubmit}>
      <div className="flexbox align-center">
        <div className="input-group">
          <div className="input-group-append">
            <Button type="submit">
              <FontAwesomeIcon icon={faSearch} />
            </Button>
          </div>
          <CreatableSelect
            components={{ DropdownIndicator: null }}
            inputValue={inputText}
            value={geneArray}
            className="gene-keyword-search-input"
            isClearable
            isMulti
            isValidNewOption={() => false}
            noOptionsMessage={() => (inputText.length > 1 ? 'No matching genes' : 'Type to search...')}
            options={geneOptions}
            onChange={value => setGeneArray(value ? value : [])}
            onInputChange={inputValue => setInputText(inputValue)}
            onKeyDown={handleKeyDown}
            // the default blur behavior removes any entered free text,
            // we want to instead auto-convert entered free text to a gene tag
            onBlur={syncGeneArrayToInputText}
            placeholder={'Genes (e.g. "PTEN NF2")'}
          />
        </div>
        <label htmlFor="gene-list-upload"
          data-toggle="tooltip"
          className="icon-button"
          title="Upload a list of genes to search from a file">
          <input id="gene-list-upload" type="file" onChange={e => readGeneListFile(e.target.files[0])}/>
          <FontAwesomeIcon className="action fa-lg" icon={faFileUpload} />
        </label>
      </div>
      <Modal
        show={showEmptySearchModal}
        onHide={() => {setShowEmptySearchModal(false)}}
        animation={false}
        bsSize='small'>
        <Modal.Body className="text-center">
          Enter at least one gene to search
        </Modal.Body>
      </Modal>

    </form>
  )
}

/** takes an array of gene name strings, and returns options suitable for react-select */
function getOptionsFromGenes(genes) {
  return genes.map(geneName => ({
    label: geneName,
    value: geneName
  }))
}
