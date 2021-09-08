/**
* @fileoverview Validates Single Cell Portal files on the user's computer
*/

import { readLinesAndType } from './io'

/** Remove white spaces and quotes from a string value */
function clean(value) {
  return value.trim().replaceAll(/"/g, '')
}

/**
 * Verify headers are unique and not empty
 */
function validateUniqueHeaders(headers) {
  const issues = []
  const uniques = new Set(headers)

  // Are headers unique?
  if (uniques.size !== headers.length) {
    const seen = new Set()
    const duplicates = new Set()
    headers.forEach(header => {
      if (header in seen) {duplicates.add(header)}
      seen.add(header)
    })

    const dupString = [...duplicates].join(', ')
    const msg = `Duplicate header names are not allowed: ${dupString}`
    issues.push(['error', 'format', msg])
  }

  // Are all headers non-empty?
  if (uniques.has('')) {
    const msg = 'Headers cannot contain empty values'
    issues.push(['error', 'format', msg])
  }

  return issues
}

async function validateSpecies(lines) {
  const taxonomyUrl = 'https://github.com/obophenotype/ncbitaxon/releases/download/v2021-06-10/taxslim.obo'

  const response = fetch(taxonomyUrl)
  const data = await response.text()
  const lines = data.split('\n')

  const namesById = {}

  for (let i = 0; i < namesById; i++) {

  }

  fetch('https://github.com/obophenotype/ncbitaxon/releases/download/v2021-06-10/taxslim.obo')
}

// def retrieve_ols_term(self, ontology_urls, term, property_name, attribute_type):
//   """Retrieve an individual term from an ontology
//   returns JSON payload of ontology, or None if unsuccessful
//   Will store any retrieved ontologies for faster validation of downstream terms
//   """
//   OLS_BASE_URL = "https://www.ebi.ac.uk/ols/api/ontologies/"
//   # separate ontology shortname from term ID number
//   # valid separators are underscore and colon (used by HCA)
//   try:
//       ontology_shortname, term_id = re.split("[_:]", term)
//   except (ValueError, TypeError):
//       msg = f'{property_name}: Could not parse provided ontology id, "{term}".'
//       if attribute_type == "array":
//           if "|" not in term:
//               msg += (
//                   f" There is only one array value, for ontology id, '{term}.' "
//                   "If multiple values are expected, use a pipe ('|') to separate values."
//               )

//       raise ValueError(msg)
//   # check if we have already retrieved this ontology reference
//   if ontology_shortname not in self.cached_ontologies:
//       metadata_url = OLS_BASE_URL + ontology_shortname
//       self.cached_ontologies[ontology_shortname] = request_json_with_backoff(
//           metadata_url
//       )
//   metadata_ontology = self.cached_ontologies[ontology_shortname]

//   # check if the ontology parsed from the term is the same ontology defined in the convention
//   # if so, skip the extra call to OLS; otherwise, retrieve the convention-defined ontology for term lookups
//   convention_ontology = None
//   if metadata_ontology is not None:
//       reference_url = metadata_ontology["_links"]["self"]["href"]
//       matches = [
//           url for url in ontology_urls if url.lower() == reference_url.lower()
//       ]
//       if matches:
//           convention_ontology = metadata_ontology.copy()
//       else:
//           # store all convention ontologies for lookup later
//           for convention_url in ontology_urls:
//               convention_shortname = extract_terminal_pathname(convention_url)
//               convention_ontology = request_json_with_backoff(convention_url)
//               self.cached_ontologies[convention_shortname] = convention_ontology

//   if convention_ontology and metadata_ontology:
//       base_term_uri = metadata_ontology["config"]["baseUris"][0]
//       # temporary workaround for invald baseURI returned from EBI OLS for NCBITaxon (SCP-2820)
//       if base_term_uri == "http://purl.obolibrary.org/obo/NCBITAXON_":
//           base_term_uri = "http://purl.obolibrary.org/obo/NCBITaxon_"
//       query_iri = encode_term_iri(term_id, base_term_uri)

//       term_url = convention_ontology["_links"]["terms"]["href"] + "/" + query_iri
//       # add timeout to prevent request from hanging indefinitely
//       response = requests.get(term_url, timeout=60)
//       # inserting sleep to minimize 'Connection timed out' error with too many concurrent requests
//       time.sleep(0.25)
//       if response.status_code == 200:
//           # return canonical label, along with synonyms and any 'related synonyms' to match later
//           term_json = response.json()
//           labels = {"label": term_json["label"], "synonyms": []}
//           synonyms = []
//           if term_json['synonyms']:
//               synonyms += term_json['synonyms']
//           # safe lookup of nested dictionary
//           related_synonyms = term_json.get('annotation', {}).get('has_related_synonym')
//           if related_synonyms:
//               synonyms += related_synonyms
//           # uniquify list via set and return
//           labels["synonyms"] = list(set(synonyms))
//           return labels
//       else:
//           error_msg = f"{property_name}: No match found in EBI OLS for provided ontology ID: {term}"
//           raise ValueError(error_msg)
//   elif not metadata_ontology:
//       error_msg = f'No result from EBI OLS for provided ontology shortname "{ontology_shortname}"'
//       print(error_msg)
//       user_logger.error(error_msg)
//       raise ValueError(
//           f"{property_name}: No match found in EBI OLS for provided ontology ID: {term}"
//       )
//   else:
//       error_msg = (
//           f"encountered issue retrieving {ontology_urls} or {ontology_shortname}"
//       )
//       print(error_msg)
//       user_logger.info(error_msg)
//       raise RuntimeError(error_msg)

/**
 * Verify second row starts with TYPE (case-insensitive)
 */
function validateTypeKeyword(annotTypes) {
  const issues = []

  const value = annotTypes[0]

  if (value.toUpperCase() === 'TYPE') {
    if (value !== 'TYPE') {
      const msg = `File keyword "TYPE" provided as "${value}"`
      issues.push(['warn', 'format', msg])
    }
  } else {
    const msg =
      'Second row, first column must be "TYPE" (case insensitive).  ' +
      `Provided value was "${value}".`
    issues.push(['error', 'format', msg])
  }

  return issues
}

/**
 * Guess whether column delimiter is comma or tab.
 *
 * Consider using `papaparse` NPM package once it supports ES modules.
 * Upstream task: https://github.com/mholt/PapaParse/pull/875
 */
function sniffDelimiter(lines) {
  const [line1, line2] = lines.slice(0, 2)
  const delimiters = [',', '\t']
  let bestDelimiter

  delimiters.forEach(delimiter => {
    const numFieldsLine1 = line1.split(delimiter).length
    const numFieldsLine2 = line2.split(delimiter).length

    if (numFieldsLine1 !== 1 && numFieldsLine1 === numFieldsLine2) {
      bestDelimiter = delimiter
    }
  })

  return bestDelimiter
}

/** Validate a local metadata file */
async function validateMetadata(file) {
  const { lines, fileType } = await readLinesAndType(file, 2)

  const delimiter = sniffDelimiter(lines)
  const table = lines.map(line => line.split(delimiter))

  let issues = []

  // Remove white spaces and quotes, and lowercase annotTypes
  const headers = table[0].map(header => clean(header))
  const annotTypes = table[1].map(type => clean(type))

  issues = issues.concat(
    validateUniqueHeaders(headers),
    validateTypeKeyword(annotTypes)
  )

  return issues
}

/** Validate a local file, return list of any detected errors */
export async function validateFile(file, studyFileType) {
  let issues = []
  if (studyFileType === 'metadata') {issues = await validateMetadata(file)}

  // Ingest Pipeline reports "issues", which includes "errors" and "warnings".
  // Keep issue type distinction in this module to ease porting, but for now
  // only report errors.
  const errors = issues.filter(issue => issue[0] === 'error')

  return errors
}

