# static-image-pipeline
This is a proof-of-concept for a static image pipeline for gene expression scatter plots.

# Background
## Product
The goal is to render expression plots > 1M cells in < 1s for all genes.  The underlying principle is decoupling "time to view" from "time to interactive".  Previously, users would have to wait > 15 seconds to see such plots, because processing for interactivity was tightly coupled to processing for display.  If this proof matures as hoped, although users won't be able to interact with them right away, users will _see_ such plots _instantly_.  That visualization speed enables drastically better scientific exploration for large datasets.

## Engineering
In this nascent phase, the pipeline uses Puppeteer to crawl staging SCP, and screenshots a series of plots as static images.  These images will be loaded to a GCP bucket and instantly fetched and displayed by the SCP frontend, while the traditional Plotly.js interactive plot is progressively loaded in the background.

## More details
Further technical plans, motivations, etc. are described in a "[Batch cache visualization](https://docs.google.com/document/d/1-mhtoWrg3RHoDjWrHGv2h-KtlnnYGPg5-lxlgRyWaK0/edit)" technical design document.

# Install
Ensure you have the prerequisites:
* [nvm](https://github.com/nvm-sh/nvm/blob/master/README.md#installing-and-updating)
* Node >= 18 (`nvm install 18`)

Then:
```
cd static-image-pipeline
yarn install
```

# Run
Connect to Broad VPN, then:

```
cd static-image-pipeline
mkdir images
node expression-scatter-plots.js --accession="SCP303"
```
