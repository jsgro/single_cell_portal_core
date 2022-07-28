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

const origin = 'https://singlecell-staging.broadinstitute.org'
// const origin = 'https://localhost:3000'

// Make `images` directory if absent
access('images', async err => {
  if (err) {
    await mkdir('images')
  }
})

// Cache for X, Y, and possibly Z coordinates
const coordinates = {}

const timedOutGenes = {}

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
  print(`Inputting search for gene: ${gene}`, preamble)
  // Trigger a gene search
  await page.waitForSelector('#study-visualize-nav')
  await page.click('#study-visualize-nav')
  await page.waitForSelector('.gene-keyword-search input')
  await page.waitForSelector('.gene-keyword-search input')
  await page.type('.gene-keyword-search input', gene, { delay: 1 })
  await page.keyboard.press('Enter')
  await page.$eval('.gene-keyword-search button', el => el.click())
  print(`Awaiting expression plot for gene: ${gene}`, preamble)
  const expressionPlotStartTime = Date.now()

  try {
    // Wait for reliable signal that expression plot has finished rendering.
    // A Mixpanel / Bard log request always fires immediately upon render.
    await page.waitForRequest(request => {
      // print('request', preamble)
      // console.log(request)
      return isExpressionScatterPlotLog(request, gene)
    }, { timeout: 45_000 })
  } catch (error) {
    timedOutGenes[gene] = 1
    return
  }
  // expScatterPlotLogRequest.abort()

  const expressionPlotPerfTime = Date.now() - expressionPlotStartTime
  print(`Expression plot time for gene ${gene}: ${expressionPlotPerfTime} ms`, preamble)

  // Height and width of plot, x- and y-offset from viewport origin
  const clipDimensions = { height: 595, width: 660, x: 5, y: 375 }

  // Take a screenshot, save it locally.
  const imagePath = `images/${gene}.webp`
  await page.screenshot({ path: imagePath, type: 'webp', clip: clipDimensions })

  print(`Wrote ${imagePath}`, preamble)

  await page.waitForTimeout(500)

  return
}

/** Return if request is for key plot, and (if so) for which gene */
function detectExpressionScatterPlot(request) {
  const url = request.url()
  if (url.includes('expression&gene=')) {
    const gene = url.split('gene=')[1]
    return [true, gene]
  } else {
    return [false, null]
  }
}

/** Many requests are extraneous to render gene expression scatter plots */
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

/** Remove extraneous field parameters from SCP API call */
function trimExpressionScatterPlotUrl(url) {
  url = url.replace('cells%2Cannotation%2C', '')
  if (Object.keys(coordinates).length > 0) {
    // `coordinates` is only needed once, so don't ask for
    // them if we have them already
    url = url.replace('=coordinates%2C', '')
  }
  return url
}

/** CPU-level wrapper to make images for a sub-list of genes */
async function processScatterPlotImages(genes, context) {
  const { accession, preamble, origin } = context
  // const browser = await puppeteer.launch()
  // const browser = await puppeteer.launch({ headless: false, devtools: true, acceptInsecureCerts: true, args: ['--ignore-certificate-errors'] })
  const browser = await puppeteer.launch({ acceptInsecureCerts: true, args: ['--ignore-certificate-errors'] })
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

  await page.setRequestInterception(true)
  page.on('request', request => {
    if (isAlwaysIgnorable(request)) {
      // Drop extraneous requests, to minimize undue  load
      request.abort()
    } else {
      const headers = Object.assign({}, request.headers(), {
        // 'sec-ch-ua': undefined, // remove "sec-ch-ua" header
        'sec-ch-ua': '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
        'sec-ch-ua-platform': '"macOS"'
      })
      const isESPlot = detectExpressionScatterPlot(request)[0]
      let url = request.url()
      if (isESPlot) {
        const trimmedUrl = trimExpressionScatterPlotUrl(url)
        if (trimmedUrl !== url) {
          url = trimmedUrl
          fetch(trimmedUrl).then(response => {
            const json = response.json()
            const newJson = Object.assign(json, coordinates)
            request.respond({ body: newJson })
          })
        } else {
          request.continue({ url, headers })
        }
        // print('trimmed url')
        // print(url)
      }
      // print('url', preamble)
      // print(url, preamble)
    }
  })

  page.on('response', async response => {
    const isESPlot = detectExpressionScatterPlot(response)[0]
    if (isESPlot) {
      console.log('got ESPlot!')
      const json = await response.json()
      if (json?.data?.x) {
        console.log('got ESPlot coordinates!')
        coordinates.x = json.data.x
        coordinates.y = json.data.y
        if ('z' in json.data) {
          coordinates.z = json.data.z
        }
        console.log('Object.keys(coordinates).length')
        console.log(Object.keys(coordinates).length)
      }
    }
  })

  page.on('requestfailed', request => {
    const [isESPlot, gene] = detectExpressionScatterPlot(request)
    if (isESPlot) {
      print('request.url()', preamble)
      console.log(request.url())
      console.log(request.headers())
      console.log(request.failure())
      console.log('failedGene', gene)
    }
  })

  // page.on('error', err => {
  //   print(`Error: ${err.toString()}`, preamble)
  // })

  // page.on('pageerror', err => {
  //   console.log(`Page error: ${err.toString()}`)
  // })

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

    // Clear search input to avoid wrong plot type
    await page.$eval('.gene-keyword-search-input svg', el => el.parentElement.click())
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

let startTime
(async () => {
  const accession = values.accession
  console.log(`Accession: ${accession}`)

  startTime = Date.now()

  // Get list of all genes in study
  const exploreApiUrl = `${origin}/single_cell/api/v1/studies/${accession}/explore`
  console.log(`Fetching ${exploreApiUrl}`)
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


console.log(`Timed out genes: ${Object.keys(timedOutGenes).length}`)
console.log(timedOutGenes)

const perfTime = Date.now() - startTime
console.log(`Completed image pipeline, time: ${perfTime} ms`)
