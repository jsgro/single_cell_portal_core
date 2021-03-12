import { useEffect, useLayoutEffect, useRef } from 'react'

/** like useEffect, but will not run on initial render */
export function useUpdateEffect(fn, inputs) {
  const didMountRef = useRef(false)

  useEffect(() => {
    if (didMountRef.current) {
      fn()
    } else {
      didMountRef.current = true
    }
  }, inputs)
}

/** like useEffect, but will not run on initial render */
export function useUpdateLayoutEffect(fn, inputs) {
  const didMountRef = useRef(false)

  useLayoutEffect(() => {
    if (didMountRef.current) {
      fn()
    } else {
      didMountRef.current = true
    }
  }, inputs)
}
