import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faFileUpload } from '@fortawesome/free-solid-svg-icons'
import Button from 'react-bootstrap/lib/Button'
import Modal from 'react-bootstrap/lib/Modal'
import CreatableSelect from 'react-select/creatable'
import _differenceBy from 'lodash/differenceBy'
import stringSimilarity from 'string-similarity'

import { log, logStudyGeneSearch } from 'lib/metrics-api'


/** renders the gene text input
  * This shares a lot of logic with search/genes/GeneKeyword, but is kept as a separate component for
  * now, as the need for autocomplete raises additional complexity
  */
export default function StudyGeneField({ genes, searchGenes, allGenes, speciesList }) {
  const [inputText, setInputText] = useState('')

  let geneOptions = []
  if (allGenes) {
    // Autocomplete when user starts typing
    if (inputText) {
      const similar = stringSimilarity.findBestMatch(inputText, allGenes)
      const sortedMatches = similar.ratings.sort((a, b) => b.rating - a.rating)
      const topMatches = sortedMatches.map(match => match.target).slice(0, 20) // Show up to 20 matches
      geneOptions = getOptionsFromGenes(topMatches)
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
  function handleSearch(event) {
    event.preventDefault()
    const newGeneArray = syncGeneArrayToInputText()
    if (newGeneArray && newGeneArray.length) {
      const genesToSearch = newGeneArray.map(g => g.value)
      if (event) { // this was not a 'clear'
        const trigger = event.type // 'click' or 'submit'
        logStudyGeneSearch(genesToSearch, trigger, speciesList)
      }
      searchGenes(genesToSearch)
    } else {
      setShowEmptySearchModal(true)
    }
  }

  /** Converts any current typed free text to a gene array entry */
  function syncGeneArrayToInputText() {
    const inputTextValues = inputText.trim().split(/[\s,]+/)
    if (!inputTextValues.length || !inputTextValues[0].length) {
      return geneArray
    }
    const newGeneArray = geneArray.concat(getOptionsFromGenes(inputTextValues))
    logGeneArrayChange(newGeneArray)
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

  /** send analytics on how the gene search input changed */
  function logGeneArrayChange(newArray) {
    try {
      let actionName = ''
      let geneDiff = []
      if (newArray.length > geneArray.length) {
        actionName = 'add'
        geneDiff = _differenceBy(newArray, geneArray, 'value')
      } else {
        actionName = 'remove'
        geneDiff = _differenceBy(geneArray, newArray, 'value')
      }
      log('change:multiselect', {
        text: geneDiff.map(item => item.value).join(','),
        action: actionName,
        type: 'gene',
        numPreviousGenes: geneArray.length
      })
    } catch (err) {
      // no-op, we just don't want logging fails to break the application
    }
  }

  /** handles the change event corresponding a a user adding or clearing one or more genes */
  function handleSelectChange(value) {
    // react-select doesn't expose the actual click events, so we deduce the kind
    // of operation based on whether it lengthened or shortened the list
    const newValue = value ? value : []
    logGeneArrayChange(newValue)
    setGeneArray(newValue)
  }

  useEffect(() => {
    if (genes.join(',') !== geneArray.map(opt => opt.label).join(',')) {
      // the genes have been updated elsewhere -- resync
      setGeneArray(getOptionsFromGenes(genes))
      setInputText('')
    }
  }, [genes.join(',')])

  return (
    <form className="gene-keyword-search gene-study-keyword-search form-horizontal" onSubmit={handleSearch}>
      <div className="flexbox align-center">
        <div className="input-group">
          <div className="input-group-append">
            <Button type="button" data-analytics-name="gene-search-submit" onClick={handleSearch}>
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
            onChange={handleSelectChange}
            onInputChange={inputValue => setInputText(inputValue)}
            onKeyDown={handleKeyDown}
            // the default blur behavior removes any entered free text,
            // we want to instead auto-convert entered free text to a gene tag
            onBlur={syncGeneArrayToInputText}
            placeholder={'Genes (e.g. "PTEN NF2")'}
            styles={{
              // if more genes are entered than fit, use a vertical scrollbar
              // this is probably not optimal UX, but good enough for first release and monitoring
              valueContainer: (provided, state) => ({
                ...provided,
                maxHeight: '32px',
                overflow: 'auto'
              }),
              menuList: (provided, state) => ({
                ...provided,
                zIndex: 999,
                background: '#fff'
              })
            }}
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
