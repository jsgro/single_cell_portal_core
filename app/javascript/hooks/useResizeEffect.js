import { useRef } from 'react'

/** Hook that will call the given onResizeEnd function after a resizing is complete
 * The optional resizeEndDelay argument can be used to customize the amount
 * of time required before the resize is viewed as 'done'
 */
export default function useResizeEffect(onResizeEnd, resizeEndDelay=200) {
  const resizeLast = useRef(null)

  /** checks if the required delay has passed without any fresh resizes */
  function checkResizeEnd() {
    const now = new Date()
    if (resizeLast.current && now - resizeLast.current > resizeEndDelay) {
      resizeLast.current = null
      console.log('resize end')
      onResizeEnd()
    }
  }

  /** on a resize event, sets the current time and a callback
   * for checking if any new resizes have occured */
  function resizeDetected() {
    resizeLast.current = new Date()
    console.log('resize detected')
    window.setTimeout(checkResizeEnd, resizeEndDelay + 5)
  }

  window.removeEventListener('resize', resizeDetected)
  window.addEventListener('resize', resizeDetected)
}
