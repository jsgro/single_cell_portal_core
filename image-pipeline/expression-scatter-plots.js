/**
 * @fileoverview: Make static images of SCP gene expression scatter plots
 *
 * See adjacent README for installation, background
 *
 * To use, ensure you're on VPN, then:
 * cd image-pipeline
 * node expression-scatter-plots.js --accession="SCP303"
 */
import { parseArgs } from 'node:util'
import { access } from 'node:fs'
import { mkdir } from 'node:fs/promises'

import puppeteer from 'puppeteer'

const args = process.argv.slice(2)

const options = {
  accession: { type: 'string' }
}
const { values } = parseArgs({ args, options })

// Make `images` directory if absent
access('images', async err => {
  if (err) {
    await mkdir('images')
  }
})


/** In Explore view, search gene, await plot, save plot image locally */
async function makeExpressionScatterPlotImage(gene, page) {
  // Trigger a gene search
  await page.type('.gene-keyword-search input', gene, { delay: 1 })
  await page.keyboard.press('Enter')
  await page.$eval('.gene-keyword-search button', el => el.click())
  console.log(`Awaiting expression plot for gene: ${gene}`)
  const expressionPlotStartTime = Date.now()

  // Wait for reliable signal that expression plot has finished rendering.
  // A Mixpanel / Bard log request always fires immediately upon render.
  await page.waitForRequest(request => {
    if (request.url().includes('bard') && request.method() === 'POST') {
      const payload = JSON.parse(request.postData())
      const props = payload.properties
      return (payload.event === 'plot:scatter' && props.genes[0] === gene)
    }
    return false
  })

  const expressionPlotPerfTime = Date.now() - expressionPlotStartTime
  console.log(`Expression plot time: ${expressionPlotPerfTime} ms`)

  // Height and width of plot, x- and y-offset from viewport origin
  const clipDimensions = { height: 595, width: 660, x: 5, y: 375 }

  // Take a screenshot, save it locally.
  const imagePath = `images/${gene}.webp`
  await page.screenshot({ path: imagePath, type: 'webp', clip: clipDimensions })

  console.log(`Wrote ${imagePath}`)

  await page.$eval('.gene-keyword-search-input svg', el => el.parentElement.click())

  return
}

(async () => {
  const accession = values.accession
  console.log(`Accession: ${accession}`)

  // Get list of all genes in study
  const origin = 'https://singlecell-staging.broadinstitute.org'
  const exploreApiUrl = `${origin}/single_cell/api/v1/studies/${accession}/explore`
  const response = await fetch(exploreApiUrl)
  const json = await response.json()
  const uniqueGenes = json.uniqueGenes
  console.log(`Number of genes: ${uniqueGenes.length}`)

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setViewport({
    width: 1680,
    height: 1000,
    deviceScaleFactor: 1
  })

  // Go to Explore tab in Study Overview page
  const exploreViewUrl = `${origin}/single_cell/study/${accession}#study-visualize`
  console.log(`Navigating to Explore tab: ${exploreViewUrl}`)
  await page.goto(exploreViewUrl)
  console.log(`Completed loading Explore tab`)

  // Pick a random gene
  // const geneIndex = Math.floor(Math.random() * uniqueGenes.length)
  // const gene = uniqueGenes[geneIndex]

  // Generate a series of plots, then save them locally
  const genes = uniqueGenes.slice(4, 8)
  for (let i = 0; i < genes.length; i++) {
    const gene = genes[i]
    await makeExpressionScatterPlotImage(gene, page)
  }

  await browser.close()
})()
