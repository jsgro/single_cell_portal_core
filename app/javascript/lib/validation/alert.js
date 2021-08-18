/** Report file validation errors in upload UI */
export function formatAlert(errors) {
  const list = `<ul>${errors.map(columns => `<li>${columns[2]}</li>`)}</ul>`
  const numErrors = errors.length
  const errorsTxt = (numErrors === 1) ? 'error' : 'errors'
  const summary = `Your metadata file had ${numErrors} ${errorsTxt}`
  const content = `<p>${summary}:</p>${list}`
  const style =
    'color: #db3214; ' +
    'background-color: #FDD; ' +
    'border: 1px solid #db3214; ' +
    // 'display: flex; ' +
    'padding: 10px; ' +
    'border-radius: 4px;'
  const errorMsg = `<div style="${style}">${content}</div>`
  return errorMsg
}
