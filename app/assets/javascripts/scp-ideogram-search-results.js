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
  const ideoDom = document.getElementById('ideogramSearchResultsContainer')
  const ideoMiddleDom = document.getElementById('_ideogramMiddleWrap')
  const renderTargetTabContent =
    document.querySelector('#render-target .tab-content')
  const distTabDoms = document.querySelectorAll('.expression-plot')

  // Move plots down to make space for Ideogram, per UX recommendation
  distTabDoms.forEach(distTabDom => {
    distTabDom.style.position = 'relative'
    distTabDom.style.top = '100px'
  })

  // Move Ideogram to its final location
  renderTargetTabContent.prepend(ideoDom)

  // Show Ideogram
  ideoDom.style.visibility = ''
  ideoDom.style.height = '100px'
  ideoMiddleDom.style.borderBottom = '1px solid #EEE'
}

/** TODO: Remove this */
function moveLegend() {
  // Hide related genes that aren't this study
  const filteredAnnots = []
  window.ideogram.annots.forEach(chrAnnot => {
    chrAnnot.annots.forEach(annot => {
      if (window.uniqueGenes.includes(annot.name)) {
        filteredAnnots.push(annot)
      }
    })
  })

  window.ideogram.drawAnnots(filteredAnnots)
}

/**
 * Initiates "Ideogram for related genes"
 * Called from _view_gene_expression_title_bar.html.erb
 */
function createSearchResultsIdeogram() {
  if (typeof window.ideogram !== 'undefined') {
    delete window.ideogram
    $('#ideogramSearchResultsContainer').html('')
  }

  $('#ideogramWarning, #ideogramTitle').remove()

  const ideoConfig = {
    container: '#ideogramSearchResultsContainer',
    organism: window.SCP.organism.toLowerCase().replace(/ /g, '-'),
    chrWidth: 9,
    chrHeight: 100,
    chrLabelSize: 12,
    annotationHeight: 7,
    dataDir: 'https://unpkg.com/ideogram@1.23.0/dist/data/bands/native/',
    showTools: true,
    onClickAnnot,
    onLoadAnnots: moveLegend,
    onLoad() {
      const searchInput = document.querySelector('#search_genes').value.trim()

      // Handles "BRCA1,BRCA2", "BRCA1 BRCA2", and "BRCA1, BRCA2"
      const geneSymbol = searchInput.split(/[, ]/).filter(d => d !== '')[0]

      this.plotRelatedGenes(geneSymbol)
    }
  }

  window.ideogram = Ideogram.initRelatedGenes(ideoConfig, window.uniqueGenes)
}

