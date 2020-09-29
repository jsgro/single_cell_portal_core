/** Handle clicks on Ideogram annotations */
function onClickAnnot(annot) {
  document.querySelector('#search_genes').value = annot.name
  document.querySelector('#perform-gene-search').click()
  window.ideogram.plotRelatedGenes([annot.name])
}

/**
 * Displays Ideogram after getting gene search results in Study Overview
 * Called from render_gene_expression_plots.js.erb
 */
function showSearchIdeogram() {
  const ideoContainer =
    document.getElementById('searchIdeogramContainer')
  const ideoMiddle = document.getElementById('_ideogramMiddleWrap')
  const renderTargetTabContent =
    document.querySelector('#render-target .tab-content')
  const distTabs = document.querySelectorAll('.expression-plot')

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

  // To upstream: Patch minor Ideogram bug with partially-clickable annotations
  const ideoInner = document.getElementById('_ideogramInnerWrap')
  ideoInner.style.position = 'relative'
  ideoInner.style.left = '10px'
}

/**
 * Initiates "Ideogram for related genes"
 * Called from _view_gene_expression_title_bar.html.erb
 */
function createSearchIdeogram() {
  if (typeof window.ideogram !== 'undefined') {
    delete window.ideogram
    $('#searchIdeogramContainer').html('')
  }

  $('#ideogramWarning, #ideogramTitle').remove()

  const ideoConfig = {
    container: '#searchIdeogramContainer',
    organism: window.SCP.organism.toLowerCase().replace(/ /g, '-'),
    chrWidth: 9,
    chrHeight: 100,
    chrLabelSize: 12,
    annotationHeight: 7,
    dataDir: 'https://unpkg.com/ideogram@1.23.0/dist/data/bands/native/',
    showTools: true,
    onClickAnnot,
    onLoad() {
      const searchInput = document.querySelector('#search_genes').value.trim()

      // Handles "BRCA1,BRCA2", "BRCA1 BRCA2", and "BRCA1, BRCA2"
      const geneSymbol = searchInput.split(/[, ]/).filter(d => d !== '')[0]

      this.plotRelatedGenes(geneSymbol)
    }
  }

  window.ideogram = Ideogram.initRelatedGenes(ideoConfig, window.uniqueGenes)
}

