import stringSimilarity from 'string-similarity'

/**
 * Get list of autocomplete suggestions, based on input text
 *
 * Returns top 20 matches: exact prefix matches, then similar matches
 *
 * @param {String} inputString String typed by user into text input
 * @param {Array<String>} targets List of strings to match against
 */
export function getAutocompleteSuggestions(inputText, targets) {
  // Autocomplete when user starts typing
  if (!targets || !inputText) {
    return []
  }

  const text = inputText.toLowerCase()

  const exactMatch = targets.find(gene => gene === inputText)

  // Get genes that start with the input text
  const prefixMatches =
    targets.filter(gene => {
      return gene !== inputText && gene.toLowerCase().startsWith(text)
    })

  // Get similarly-named genes, as measured by Dice coefficient (`rating`)
  const similar = stringSimilarity.findBestMatch(inputText, targets)
  const similarMatches =
      similar.ratings
        .sort((a, b) => b.rating - a.rating) // Rank larger numbers higher
        .filter(match => {
          const target = match.target
          return target !== inputText && !prefixMatches.includes(target)
        })
        .map(match => match.target)

  // Show top 20 matches -- exact match, prefix matches, then similar matches
  const topMatches = prefixMatches.concat(similarMatches)
  if (exactMatch) {topMatches.unshift(exactMatch)} // Put any exact match first
  return topMatches.slice(0, 20)
}
