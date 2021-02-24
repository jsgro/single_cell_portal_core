import { useEffect } from 'react'

/** debounces the given function, waiting until thresholdMs have passed without a trigger
  * to call the function f */
function debounced(thresholdMs, f, ...args) {
  let timeout = null
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => f(...args), thresholdMs)
  }
}

/** Hook that will call the given onResizeEnd function after a resizing is complete
 * The optional resizeEndDelay argument can be used to customize the amount
 * of time required before the resize is viewed as 'done'
 */
export default function useResizeEffect(onResizeEnd, resizeEndDelay=200) {
  useEffect(() => {
    const resizeHandler = debounced(resizeEndDelay, onResizeEnd)
    window.addEventListener('resize', resizeHandler)
    return () => {
      window.removeEventListener('resize', resizeHandler)
    }
  }, [])
}
