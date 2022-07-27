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
import os from 'node:os'

import puppeteer from 'puppeteer'

const args = process.argv.slice(2)

const options = {
  accession: { type: 'string' }
}
const { values } = parseArgs({ args, options })

// const numCPUs = os.cpus().length / 2 // Count on Intel i7 is 1/2 of reported
const numCPUs = 2
console.log(`Number of CPUs to be used on this client: ${numCPUs}`)

// Make `images` directory if absent
access('images', async err => {
  if (err) {
    await mkdir('images')
  }
})

/** Print message with browser-tag preamble to local console */
function print(message, preamble) {
  console.log(`${preamble} ${message}`)
}

function isBardPost(request) {
  return request.url().includes('bard') && request.method() === 'POST'
}

/** Returns boolean for if request is relevant Bard / Mixpanel log */
function isExpressionScatterPlotLog(request) {
  if (isBardPost(request)) {
    const payload = JSON.parse(request.postData())
    const props = payload.properties
    return (payload.event === 'plot:scatter' && props.genes.length === 1)
  }
  return false
}

/** In Explore view, search gene, await plot, save plot image locally */
async function makeExpressionScatterPlotImage(gene, page, preamble) {
  print(`Inputting search for gene: ${gene}`, preamble)
  // Trigger a gene search
  await page.waitForSelector('.gene-keyword-search input')
  await page.type('.gene-keyword-search input', gene, { delay: 1 })
  await page.keyboard.press('Enter')
  await page.$eval('.gene-keyword-search button', el => el.click())
  print(`Awaiting expression plot for gene: ${gene}`, preamble)
  const expressionPlotStartTime = Date.now()

  // Wait for reliable signal that expression plot has finished rendering.
  // A Mixpanel / Bard log request always fires immediately upon render.
  await page.waitForRequest(request => {
    print('request', preamble)
    console.log(request)
    return isExpressionScatterPlotLog(request, gene)
  })

  const expressionPlotPerfTime = Date.now() - expressionPlotStartTime
  print(`Expression plot time for gene ${gene}: ${expressionPlotPerfTime} ms`, preamble)

  // Height and width of plot, x- and y-offset from viewport origin
  const clipDimensions = { height: 595, width: 660, x: 5, y: 375 }

  // Take a screenshot, save it locally.
  const imagePath = `images/${gene}.webp`
  await page.screenshot({ path: imagePath, type: 'webp', clip: clipDimensions })

  print(`Wrote ${imagePath}`, preamble)

  await page.$eval('.gene-keyword-search-input svg', el => el.parentElement.click())

  return
}

/** CPU-level wrapper to make images for a sub-list of genes */
async function processScatterPlotImages(genes, context) {
  const { accession, preamble, origin } = context
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.setViewport({
    width: 1680,
    height: 1000,
    deviceScaleFactor: 1
  })

  const timeoutMinutes = 2
  const timeoutMilliseconds = timeoutMinutes * 60 * 1000
  // page.setDefaultTimeout(0) // No timeout
  page.setDefaultTimeout(timeoutMilliseconds)

  await page.setRequestInterception(true)

  page.on('request', request => {
    if (isBardPost(request) && !isExpressionScatterPlotLog(request)) {
      request.abort()
    } else {
      request.continue()
    }
  })

  // Go to Explore tab in Study Overview page
  const exploreViewUrl = `${origin}/single_cell/study/${accession}#study-visualize`
  print(`Navigating to Explore tab: ${exploreViewUrl}`, preamble)
  await page.goto(exploreViewUrl)
  print(`Completed loading Explore tab`, preamble)

  console.log('genes.length')
  console.log(genes.length)

  for (let i = 0; i < genes.length; i++) {
    const gene = genes[i]
    await makeExpressionScatterPlotImage(gene, page, preamble)
  }

  await browser.close()
}

/** Get a segment of the uniqueGenes array to process in given CPU */
function sliceGenes(uniqueGenes, numCPUs, cpuIndex) {
  const batchSize = uniqueGenes.length / numCPUs
  const start = batchSize * cpuIndex
  const end = batchSize * (cpuIndex + 1)
  return uniqueGenes.slice(start, end)
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

  for (let cpuIndex = 0; cpuIndex < numCPUs - 1; cpuIndex++) {
    /** Log prefix to distinguish messages for different browser instances */
    const preamble = `Browser ${cpuIndex}:`

    // Pick a random gene
    // const geneIndex = Math.floor(Math.random() * uniqueGenes.length)
    // const gene = uniqueGenes[geneIndex]

    // Generate a series of plots, then save them locally
    const genes = sliceGenes(uniqueGenes, numCPUs, cpuIndex)

    const context = { accession, preamble, origin }

    processScatterPlotImages(genes, context)
  }
})()
