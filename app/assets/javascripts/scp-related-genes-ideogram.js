/** Handle clicks on Ideogram annotations */
function onClickAnnot(annot) {
  document.querySelector('#search_genes').value = annot.name
  document.querySelector('#perform-gene-search').click()
  window.ideogram.plotRelatedGenes([annot.name])
}

/**
 * Reports if current gene lacks associated taxon (aka species, organism)
 *
 * Accounts for old SCP studies, where matrices lack taxons
 */
function geneHasTaxon() {
  return window.SCP.taxon !== ''
}

/**
 * Reports if current genome assembly lacks chromosome length data
 *
 * Accounts for taxons that cannot be visualized in an ideogram.
 * Example edge case: axolotl study SCP499.
 */
function genomeHasChromosomes() {
  return window.ideogram.chromosomesArray.length === 0
}

/**
 * Displays Ideogram after getting gene search results in Study Overview
 */
function showRelatedGenesIdeogram() { // eslint-disable-line

  if (!geneHasTaxon()) return

  const ideoContainer =
    document.getElementById('related-genes-ideogram-container')
  const ideoMiddle = document.getElementById('_ideogramMiddleWrap')
  const renderTargetTabContent =
    document.querySelector('#render-target .tab-content')
  const distTabs = document.querySelectorAll('.expression-plot')

  if (!genomeHasChromosomes()) {
    ideoContainer.style.display = 'none'
    $('#related-genes-ideogram-container').html('')
    return
  } else {
    // Handles theoretical edge case: multi-species study when only one
    // organism lacks a chromosome-level genome assembly (say, a study on
    // mouse and axolotl)
    ideoContainer.style.display = ''
  }

  // Move plots down to make space for Ideogram, per UX recommendation
  distTabs.forEach(distTab => {
    distTab.style.position = 'relative'
    distTab.style.top = '100px'
  })

  // Move Ideogram to its final location
  renderTargetTabContent.prepend(ideoContainer)

  // Show Ideogram
  ideoContainer.style.visibility = ''
  ideoContainer.style.height = '100px'
  ideoMiddle.style.borderBottom = '1px solid #EEE'
  ideoMiddle.style.borderLeft = '1px solid #DDD'
  ideoMiddle.style.borderRight = '1px solid #DDD'
  ideoMiddle.style.overflowY = 'hidden'
}

/** Resize ideogram (specifically, the legend) after resizing the viewport */
function resizeRelatedGenesIdeogram() { // eslint-disable-line

  // Handles old studies, where matrices lack species
  if (!geneHasTaxon()) return

  const ideoLegend = document.getElementById('_ideogramLegend')
  const ideoRect = document.getElementById('_ideogram').getBoundingClientRect()
  ideoLegend.style.left = `${ideoRect.x - 160}px`
}

/**
 * Initiates Ideogram for related genes
 *
 * This is only done in the context of single-gene search in Study Overview
 */
function createRelatedGenesIdeogram() { // eslint-disable-line

  if (!geneHasTaxon()) return

  if (typeof window.ideogram !== 'undefined') {
    delete window.ideogram
    $('#related-genes-ideogram-container').html('')
  }

  const ideoConfig = {
    container: '#related-genes-ideogram-container',
    organism: window.SCP.taxon.toLowerCase().replace(/ /g, '-'),
    chrWidth: 9,
    chrHeight: 100,
    chrLabelSize: 12,
    annotationHeight: 7,
    dataDir: 'https://unpkg.com/ideogram@1.24.0/dist/data/bands/native/',
    showTools: true,
    onClickAnnot,
    onLoad() {
      // Handles edge case: when organism lacks chromosome-level assembly
      if (!genomeHasChromosomes()) return

      const searchInput = document.querySelector('#search_genes').value.trim()
      const geneSymbol = searchInput.split(/[, ]/).filter(d => d !== '')[0]

      this.plotRelatedGenes(geneSymbol)
    }
  }

  window.ideogram =
    Ideogram.initRelatedGenes(ideoConfig, window.SCP.uniqueGenes)
}

