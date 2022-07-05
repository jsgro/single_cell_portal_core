import { getSCPContext } from '~/providers/SCPContextProvider'

const scpContext = getSCPContext()
const env = scpContext.environment
const version = scpContext.version

/** Whether to fetch data from service worker cache */
export const isServiceWorkerCacheEnabled = scpContext.isServiceWorkerCacheEnabled

// Cache keys are like a mix of database server and collection/table names:
// they identify a cache store for individual cache entries.  Here we set up
// cache keys specific to each SCP environment and version.
const serviceWorkerCacheKeyStem = `scp-${env}`
const serviceWorkerCacheKey = `${serviceWorkerCacheKeyStem}-${version}`

/** Fetch, leveraging service worker cache if enabled and available */
export async function fetchServiceWorkerCache(url, init) {
  const swCache = await caches.open(serviceWorkerCacheKey)
  let response = await swCache.match(url)
  let hitOrMiss = 'hit'
  if (typeof response === 'undefined') {
    response = await fetch(url, init).catch(error => error)
    await swCache.put(url, response)
    hitOrMiss = 'miss'
  }
  console.debug(`Service worker cache ${hitOrMiss} for SCP API fetch of URL: ${url}`)
  const isHit = (hitOrMiss === 'hit')
  return [response, isHit]
}

/**
 * Delete service worker (SW) caches for prior versions of SCP.
 *
 * This prevents old, unused data from living forever in user's web browsers,
 * which might otherwise occupy a substantial fraction of the user's
 * total space available for SW cache.
 */
export async function clearOldServiceWorkerCaches() {
  const swCacheKeys = await caches.keys()
  swCacheKeys.forEach(thisKey => {
    if (
      thisKey.startsWith(serviceWorkerCacheKeyStem) &&
      thisKey !== serviceWorkerCacheKey
    ) {
      caches.delete(thisKey) // Delete this old SCP service worker cache
    }
  })
}
