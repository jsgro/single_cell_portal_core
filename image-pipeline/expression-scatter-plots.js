/**
 * @fileoverview: Make static images of SCP gene expression scatter plots
 *
 * See adjacent README for installation, background
 *
 * To use, ensure you're on VPN, `cd image-pipeline`, then:
 *
 * node expression-scatter-plots.js --accession="SCP24" # Staging, 1.3M cell study
 */
import { parseArgs } from 'node:util'
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import sharp from 'sharp'
import os from 'node:os'

import puppeteer from 'puppeteer'
import { exit } from 'node:process'

const args = process.argv.slice(2)

const options = {
  accession: { type: 'string' }
}
const { values } = parseArgs({ args, options })

// Candidates for CLI argument
// CPU count on Intel i7 is 1/2 of reported, due to hyperthreading
// const numCPUs = os.cpus().length / 2 - 1
const numCPUs = 1
console.log(`Number of CPUs to be used on this client: ${numCPUs}`)

// TODO (SCP-4564): Document how to adjust network rules to use staging
// const origin = 'https://singlecell-staging.broadinstitute.org'
const origin = 'https://localhost:3000'

/** Make output directories if absent */
async function makeLocalOutputDir(leaf) {
  const dir = `output/${values.accession}/${leaf}/`
  const options = { recursive: true }
  try {
    await access(dir)
  } catch {
    await mkdir(dir, options)
  }
  return dir
}

const imagesDir = await makeLocalOutputDir('images')
const jsonDir = await makeLocalOutputDir('json')

// Cache for X, Y, and possibly Z coordinates
const coordinates = {}

/** Print message with browser-tag preamble to local console */
function print(message, preamble) {
  console.log(`${preamble} ${message}`)
}

/** Is request a log post to Bard? */
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
  // Trigger a gene search
  print(`Inputting search for gene: ${gene}`, preamble)
  await page.type('.gene-keyword-search input', gene, { delay: 1 })
  await page.keyboard.press('Enter')
  await page.$eval('.gene-keyword-search button', el => el.click())
  print(`Awaiting expression plot for gene: ${gene}`, preamble)

  // Wait for reliable signal that expression plot has finished rendering.
  // A Mixpanel / Bard log request always fires immediately upon render.
  await page.waitForRequest(request => {
    return isExpressionScatterPlotLog(request, gene)
  })

  page.waitForTimeout(250) // Wait for janky layout to settle

  // Prepare background colors for later transparency via `omitBackground`
  await page.evaluate(() => {
    document.querySelector('body').style.backgroundColor = '#FFF0'
    document.querySelector('.study-explore .plot').style.background = '#FFF0'
    document.querySelector('.explore-tab-content').style.background = '#FFF0'
    document.querySelector('.scatter-graph svg').style = null

    // Remove grid lines on X, Y, and (if present) Z axes
    document.querySelector('svg .cartesianlayer').remove()

    // Remove color filling vertical bar at right
    document.querySelector('svg defs .gradients').remove()

    // Remove axis labels, colorbar label (`magnitude` in Plotly.js)
    document.querySelector('svg .infolayer').remove()
  })

  // Height and width of plot, x- and y-offset from viewport origin
  const clipDimensions = { height: 595, width: 660, x: 5, y: 310 }

  // Take a screenshot, save it locally
  const rawImagePath = `${imagesDir}${gene}-raw.webp`
  const imagePath = `${imagesDir}${gene}.webp`
  await page.screenshot({
    path: rawImagePath,
    type: 'webp',
    clip: clipDimensions,
    omitBackground: true
  })

  // Hardcoded x, y placeholders below derived in processScatterPlots via:
  // console.log(Math.min(...plotlyTraces[0].x))
  // console.log(Math.max(...plotlyTraces[0].x))
  // console.log(Math.min(...plotlyTraces[0].y))
  // console.log(Math.max(...plotlyTraces[0].y))
  // These ought to be parseable via the `coordinates` array

  const imageDescription = JSON.stringify({
    expression: [0, 2.433], // min, max of expression array
    x: [-12.568, 8.749], // min, max of x coordinates array
    y: [-15.174, 10.761], // min, max of y coordinates array
    z: []
  })
  await sharp(rawImagePath)
    .withMetadata({
      exif: {
        IFD0: {
          ImageDescription: imageDescription
        }
      }
    })
    .toFile(imagePath)

  // const metadata = await sharp(imagePath).metadata()
  // console.log('metadata:')
  // console.log(metadata)

  print(`Wrote ${imagePath}`, preamble)

  return
}

/**
 * Remove extraneous field parameters from SCP API call.
 * Substantially speeds up pipeline, if local expression data is not available.
 */
function trimExpressionScatterPlotUrl(url) {
  url = url.replace('cells%2Cannotation%2C', '')
  if (Object.keys(coordinates).length > 0) {
    // `coordinates` is only needed once, so don't ask for
    // them if we have them already
    url = url.replace('=coordinates%2C', '=')
  }
  return url
}

/** Fetch JSON data for gene expression scatter plot, before loading page */
async function prefetchExpressionData(gene, context) {
  const { accession, preamble, origin } = context

  const jsonPath = `${jsonDir}${gene}.json`

  print(`Prefetching JSON for ${gene}`, preamble)

  let isCopyOnFilesystem = true
  try {
    await access(jsonPath)
  } catch {
    isCopyOnFilesystem = false
  }

  if (isCopyOnFilesystem) {
    // Don't process with fetch if expression was already prefetched
    print(`Using local expression data for ${gene}`, preamble)
    return
  }

  // Configure URLs
  const apiStem = `${origin}/single_cell/api/v1`
  const allFields = 'coordinates%2Ccells%2Cannotation%2Cexpression'
  const params = `fields=${allFields}&gene=${gene}&subsample=all`
  const url = `${apiStem}/studies/${accession}/clusters/_default?${params}`
  const trimmedUrl = trimExpressionScatterPlotUrl(url)

  // Fetch data
  const response = await fetch(trimmedUrl)
  const json = await response.json()

  if (Object.keys(coordinates).length === 0) {
    // Cache `coordinates` and `annotations` fields; this is done only once
    coordinates.x = json.data.x
    coordinates.y = json.data.y
    if ('z' in json.data) {
      coordinates.z = json.data.z
    }
  }

  await writeFile(jsonPath, JSON.stringify(json))
  print(`Wrote prefetched JSON: ${jsonPath}`, preamble)
}

/** Is this request on critical render path for expression scatter plots? */
function isAlwaysIgnorable(request) {
  const url = request.url()
  const isGA = url.includes('google-analytics')
  const isSentry = url.includes('ingest.sentry.io')
  const isNonExpPlotBardPost = isBardPost(request) && !isExpressionScatterPlotLog(request)
  const isIgnorableLog = isGA || isSentry || isNonExpPlotBardPost
  const isViolinPlot = url.includes('/expression/violin')
  const isIdeogram = url.includes('/ideogram@')
  return (isIgnorableLog || isViolinPlot || isIdeogram)
}

/** Return if request is for expression plot, and (if so) for which gene */
function detectExpressionScatterPlot(request) {
  const url = request.url()
  if (url.includes('expression&gene=')) {
    const gene = url.split('gene=')[1].split('&')[0]
    return [true, gene]
  } else {
    return [false, null]
  }
}

/** Drop extraneous requests, or replace requests that have pre-fetched data */
async function configureIntercepts(page) {
  await page.setRequestInterception(true)
  page.on('request', async request => {
    if (isAlwaysIgnorable(request)) {
      // Cancel requests not on critical render path, to minimize undue load
      request.abort()
    } else {
      const headers = Object.assign({}, request.headers())
      const [isESPlot, gene] = detectExpressionScatterPlot(request)
      if (isESPlot) {
        console.log('Reading local file for:')
        console.log(request.url())
        // Replace SCP API request for expression data with prefetched data.
        //
        // If these files could be made by Ingest Pipeline and put in a bucket,
        // then Image Pipeline could run against production web app while
        // incurring virtually no load for app server or DB server, and likely
        // complete warming a study's image cache 5-10x faster.
        const jsonString = await readFile(`${jsonDir}${gene}.json`, { encoding: 'utf-8' })
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: jsonString
        })
      } else {
        request.continue({ headers })
      }
    }
  })
}

/** CPU-level wrapper to make images for a sub-list of genes */
async function processScatterPlotImages(genes, context) {
  const { accession, preamble, origin } = context
  // const browser = await puppeteer.launch()
  const browser = await puppeteer.launch({ headless: false, devtools: true, acceptInsecureCerts: true, args: ['--ignore-certificate-errors'] })

  // Needed for localhost; doesn't hurt to use in other environments
  // const browser = await puppeteer.launch({ acceptInsecureCerts: true, args: ['--ignore-certificate-errors'] })
  const page = await browser.newPage()
  await page.setViewport({
    width: 1680,
    height: 1000,
    deviceScaleFactor: 1
  })

  // const timeoutMinutes = 0.25
  const timeoutMinutes = 2
  const timeoutMilliseconds = timeoutMinutes * 60 * 1000
  // page.setDefaultTimeout(0) // No timeout
  page.setDefaultTimeout(timeoutMilliseconds)

  // Drop needless requests, re-route SCP API calls for expression data
  configureIntercepts(page)

  // Go to Explore tab in Study Overview page
  const exploreViewUrl = `${origin}/single_cell/study/${accession}?subsample=all#study-visualize`
  print(`Navigating to Explore tab: ${exploreViewUrl}`, preamble)
  await page.goto(exploreViewUrl)
  print(`Completed loading Explore tab`, preamble)

  print(`Number of genes to image: ${genes.length}`, preamble)

  await page.waitForSelector('#study-visualize-nav')
  await page.click('#study-visualize-nav')
  await page.waitForSelector('.gene-keyword-search input')

  for (let i = 0; i < genes.length; i++) {
    const expressionPlotStartTime = Date.now()

    const gene = genes[i]
    await prefetchExpressionData(gene, context)
    await makeExpressionScatterPlotImage(gene, page, preamble)

    // Clear search input to avoid wrong plot type
    await page.$eval('.gene-keyword-search-input svg', el => el.parentElement.click())

    const expressionPlotPerfTime = Date.now() - expressionPlotStartTime
    print(`Expression plot time for gene ${gene}: ${expressionPlotPerfTime} ms`, preamble)

    // Helpful for local development iterations
    // if (accession === 'SCP138' && gene === 'A1BG-AS1') {
    //   exit()
    // }
  }

  await browser.close()
}

/** Get a segment of the uniqueGenes array to process in given CPU */
function sliceGenes(uniqueGenes, numCPUs, cpuIndex) {
  const batchSize = Math.round(uniqueGenes.length / numCPUs)
  const start = batchSize * cpuIndex
  const end = batchSize * (cpuIndex + 1)
  return uniqueGenes.slice(start, end)
}

// For tracking total runtime, internally
let startTime

// Main  function
(async () => {
  const accession = values.accession
  console.log(`Accession: ${accession}`)

  startTime = Date.now()

  // Get list of all genes in study
  const exploreApiUrl = `${origin}/single_cell/api/v1/studies/${accession}/explore`
  console.log(`Fetching ${exploreApiUrl}`)

  const response = await fetch(exploreApiUrl)
  let json
  try {
    json = await response.json()
  } catch (error) {
    console.log('Failed to fetch:')
    console.log(exploreApiUrl)
    exit(1)
  }
  const uniqueGenes = json.uniqueGenes
  console.log(`Total number of genes: ${uniqueGenes.length}`)

  for (let cpuIndex = 0; cpuIndex < numCPUs; cpuIndex++) {
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

// // This executes immediately after calling main function.
// // Perhaps refactor that to use Promise.all, then call this as a function.
// console.log(`Timed out genes: ${Object.keys(timedOutGenes).length}`)
// console.log(timedOutGenes)

// const perfTime = Date.now() - startTime
// console.log(`Completed image pipeline, time: ${perfTime} ms`)
