/** Handle clicks on Ideogram annotations */
function onClickAnnot(annot) {
  document.querySelector('#search_genes').value = annot.name
  document.querySelector('#perform-gene-search').click()
  window.ideogram.plotRelatedGenes([annot.name])
}

/**
 * Displays Ideogram after getting gene search results in Study Overview
 *
 * Called from render_gene_expression_plots.js.erb
 */
function showRelatedGenesIdeogram() { // eslint-disable-line

  // Handles old studies, where matrices lack species
  if (window.SCP.organism === '') return

  const ideoContainer =
    document.getElementById('related-genes-ideogram-container')
  const ideoMiddle = document.getElementById('_ideogramMiddleWrap')
  const renderTargetTabContent =
    document.querySelector('#render-target .tab-content')
  const distTabs = document.querySelectorAll('.expression-plot')

  if (window.ideogram.chromosomesArray.length === 0) {
    // Handles rare edge case: gene is from a matrix that has
    // an associated organism, but the organism has no chromosome-level
    // genome assembly.  Example: axolotl study SCP499.
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

/**
 * Resize ideogram (specifically, the legend) after resizing the viewport
 *
 * Called from render_gene_expression_plots.js.erb
*/
function resizeRelatedGenesIdeogram() { // eslint-disable-line

  // Handles old studies, where matrices lack species
  if (window.SCP.organism === '') return

  const ideoLegend = document.getElementById('_ideogramLegend')
  const ideoRect = document.getElementById('_ideogram').getBoundingClientRect()
  ideoLegend.style.left = `${ideoRect.x - 160}px`
}

/**
 * Initiates Ideogram for related genes
 *
 * Called from _view_gene_expression_title_bar.html.erb
 */
function createRelatedGenesIdeogram() { // eslint-disable-line

  // Handles old studies, where matrices lack species
  if (window.SCP.organism === '') return

  if (typeof window.ideogram !== 'undefined') {
    delete window.ideogram
    $('#related-genes-ideogram-container').html('')
  }

  const ideoConfig = {
    container: '#related-genes-ideogram-container',
    organism: window.SCP.organism.toLowerCase().replace(/ /g, '-'),
    chrWidth: 9,
    chrHeight: 100,
    chrLabelSize: 12,
    annotationHeight: 7,
    dataDir: 'https://unpkg.com/ideogram@1.24.0/dist/data/bands/native/',
    showTools: true,
    onClickAnnot,
    onLoad() {
      const searchInput = document.querySelector('#search_genes').value.trim()

      // Handles "BRCA1,BRCA2", "BRCA1 BRCA2", and "BRCA1, BRCA2"
      const geneSymbol = searchInput.split(/[, ]/).filter(d => d !== '')[0]

      // Handles edge case: when organism lacks chromosome-level assembly
      if (window.ideogram.chromosomesArray.length === 0) return

      this.plotRelatedGenes(geneSymbol)
    }
  }

  window.ideogram = Ideogram.initRelatedGenes(ideoConfig, window.uniqueGenes)
}

