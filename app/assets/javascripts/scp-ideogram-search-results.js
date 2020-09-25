/* eslint-disable */

function onClickAnnot(annot) {
  document.querySelector('#search_genes').value = annot.name;
  document.querySelector('#perform-gene-search').click();
  plotRelatedGenes([annot.name]);
}

// Process text input for the "Search" field.
function handleSearch(event) {
  // Ignore non-"Enter" keyups
  if (event.type === 'keyup' && event.keyCode !== 13) return;

  var searchInput = event.target.value.trim();

  // Handles "BRCA1,BRCA2", "BRCA1 BRCA2", and "BRCA1, BRCA2"
  let geneSymbols = searchInput.split(/[, ]/).filter(d => d !== '')
  plotRelatedGenes(geneSymbols);
}

function showSearchIdeogram() {
  var ideoDom = document.getElementById('ideogramSearchResultsContainer');
  var ideoInnerDom = document.getElementById('_ideogramInnerWrap');
  var renderTargetTabContent = document.querySelector('#render-target .tab-content');
  var distTabDom = document.querySelector('#box-or-violin-tab');

  // Move plot down to make space for Ideogram
  distTabDom.style.position = 'relative';
  distTabDom.style.top = '100px';

  // Move Ideogram to its final location
  renderTargetTabContent.prepend(ideoDom);

  // Show Ideogram, and horizontally center it
  ideoDom.style.display = '';
  ideoDom.style.position = 'absolute';
  ideoDom.style.zIndex = '1000';
  ideoDom.style.height = '100px';
  ideoInnerDom.style.position = 'relative';
  ideoInnerDom.style.marginLeft = 'auto';
  ideoInnerDom.style.marginRight = 'auto';

  // Refine location of Ideogram chrome
  var ideoLeft = ideoInnerDom.getBoundingClientRect().left
  var ideoLegend = document.querySelector('#_ideogramLegend');
  ideoLegend.style.left = (ideoLeft - 180) + 'px';
  document.querySelector('#gear').style.right = 0;
}

function createSearchResultsIdeogram() {
  if (typeof window.ideogram !== 'undefined') {
    delete window.ideogram
    $('#_ideogramOuterWrap').html('')
  }

  $('#ideogramWarning, #ideogramTitle').remove();

  console.log('***** foo')
  ideoConfig = {
    container: '#ideogramSearchResultsContainer',
    organism: window.SCP.organism.toLowerCase().replace(/ /g, '-'),
    chrWidth: 9,
    chrHeight: 100,
    chrLabelSize: 12,
    annotationHeight: 7,
    dataDir: 'https://unpkg.com/ideogram@1.23.0/dist/data/bands/native/',
    showTools: true,
    onClickAnnot: onClickAnnot,
    onLoad: function() {
      // let left = document.querySelector('#_ideogramInnerWrap').style['max-width'];
      // left = (parseInt(left.slice(0, -2)) + 90);
      // document.querySelector('#ideogramSearchResultsContainer').style.width = left + 'px';

      var searchInput = document.querySelector('#search_genes').value.trim();

      // Handles "BRCA1,BRCA2", "BRCA1 BRCA2", and "BRCA1, BRCA2"
      let geneSymbols = searchInput.split(/[, ]/).filter(d => d !== '')
      // plotGeneAndParalogs(geneSymbols);
      console.log('***** bar')
      this.plotRelatedGenes(geneSymbols);
    }
  }

  window.ideogram = Ideogram.initRelatedGenes(ideoConfig)
}

