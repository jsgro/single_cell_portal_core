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
  const ideoInnerDom = document.getElementById('_ideogramInnerWrap')
  const ideoMiddleDom = document.getElementById('_ideogramMiddleWrap')
  const renderTargetTabContent =
    document.querySelector('#render-target .tab-content')
  const distTabDoms = document.querySelectorAll('.expression-plot')

  // Move plot down to make space for Ideogram
  distTabDoms.forEach(distTabDom => {
    distTabDom.style.position = 'relative'
    distTabDom.style.top = '100px'
  })

  // Move Ideogram to its final location
  renderTargetTabContent.prepend(ideoDom)

  // Show Ideogram, and horizontally center it
  ideoDom.style.display = ''
  ideoDom.style.position = 'absolute'
  ideoDom.style.zIndex = '1000'
  ideoDom.style.height = '100px'
  ideoInnerDom.style.position = 'relative'
  ideoInnerDom.style.marginLeft = 'auto'
  ideoInnerDom.style.marginRight = 'auto'
  ideoMiddleDom.style.borderBottom = '1px solid #EEE'

  // Refine location of Ideogram chrome
  const ideoLeft = ideoInnerDom.getBoundingClientRect().left
  const ideoLegend = document.querySelector('#_ideogramLegend')
  ideoLegend.style.left = `${ideoLeft - 150}px`
}

/** TODO: Remove this */
function moveLegend() {
  console.log('%%% in moveLegend')
  const ideoInnerDom = document.getElementById('_ideogramInnerWrap')

  // Refine location of Ideogram chrome
  const ideoLeft = ideoInnerDom.getBoundingClientRect().left
  const ideoLegend = document.querySelector('#_ideogramLegend')
  ideoLegend.style.left = `${ideoLeft - 150}px`


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
    $('#_ideogramOuterWrap').html('')
  }

  $('#ideogramWarning, #ideogramTitle').remove()

  console.log('***** starting createSearchResultsIdeogram')
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
      const geneSymbols = searchInput.split(/[, ]/).filter(d => d !== '')
      // plotGeneAndParalogs(geneSymbols);
      console.log('***** in Ideogram onLoad')
      this.plotRelatedGenes(geneSymbols)
    }
  }

  window.ideogram = Ideogram.initRelatedGenes(ideoConfig)
}

