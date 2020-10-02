/**
 * @fileoverview Ideogram for related genes
 *
 * This code enhances single-gene search in the Study Overview page.  It is
 * called upon searching for a gene, invoking functionality in Ideogram.js to
 * retrieve and plot related genes across the genome.  Users can then click a
 * related gene to trigger a search on that gene.  The intent is to improve
 * discoverability for genes of biological interest.
 *
 * More context, a screenshot, and architecture diagram are available at:
 * https://github.com/broadinstitute/single_cell_portal_core/pull/735
 */

/** Handle clicks on Ideogram annotations */
function onClickAnnot(annot) {
  document.querySelector('#search_genes').value = annot.name
  document.querySelector('#perform-gene-search').click()
  window.ideogram.plotRelatedGenes([annot.name])
}

/**
 * Reports if current gene has associated taxon (aka species, organism)
 *
 * Enables handling for old SCP studies, where matrices lack taxons
 */
function geneHasTaxon() {
  return window.SCP.taxon !== ''
}

/**
 * Reports if current genome assembly has chromosome length data
 *
 * Enables handling for taxons that cannot be visualized in an ideogram.
 * Example edge case: axolotl study SCP499.
 */
function genomeHasChromosomes() {
  return window.ideogram.chromosomesArray.length > 0
}

/**
 * Move Ideogram within expresion plot tabs, per UX recommendation
*/
function putIdeogramInPlotTabs(ideoContainer) {
  const tabContent = document.querySelector('#render-target .tab-content')
  const ideoOuter = document.querySelector('#_ideogramOuterWrap')
  const distTabs = document.querySelectorAll('.expression-plot')
  const chrHeight = `${window.ideogram.config.chrHeight}px`

  // Ideogram has `position: absolute`, so manual top offsets are needed
  distTabs.forEach(distTab => distTab.style.top = chrHeight)
  ideoOuter.style.height = chrHeight

  tabContent.prepend(ideoContainer)
}

/**
 * Displays Ideogram after getting gene search results in Study Overview
 */
function showRelatedGenesIdeogram() { // eslint-disable-line

  if (!geneHasTaxon()) return

  const ideoContainer =
    document.querySelector('#related-genes-ideogram-container')

  if (!genomeHasChromosomes()) {
    ideoContainer.classList = ''
    ideoContainer.innerHTML = ''
    return
  } else {
    // Handles theoretical edge case: multi-species study when only one
    // organism lacks a chromosome-level genome assembly (say, a study on
    // mouse and axolotl)
    ideoContainer.classList = ''
  }

  putIdeogramInPlotTabs(ideoContainer)

  // Make Ideogram visible
  ideoContainer.classList = 'show-related-genes-ideogram'
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

  // Clear any prior ideogram
  if (typeof window.ideogram !== 'undefined') {
    delete window.ideogram
    document.querySelector('#related-genes-ideogram-container').innerHTML = ''
  }

  const ideoConfig = {
    container: '#related-genes-ideogram-container',
    organism: window.SCP.taxon,
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

