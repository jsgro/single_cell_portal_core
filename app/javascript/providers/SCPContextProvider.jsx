// JS variables wrapped in double underscores are defined in version.txt
const version = __SCP_VERSION__

// Set by running the following in terminal in local SCP instance:
// VITE_FRONTEND_SERVICE_WORKER_CACHE="true" bin/vite dev
const isServiceWorkerCacheEnabled = __FRONTEND_SERVICE_WORKER_CACHE__ ?? false

/**  wrapper around window.SCP to enumerate properties the React frontend expects from the server */
export function getSCPContext() {
  if (window.SCP) {
    window.SCP.version = version
    window.SCP.isServiceWorkerCacheEnabled = isServiceWorkerCacheEnabled
    return window.SCP
  }
  return {
    userAccessToken: 'test',
    environment: 'test',
    analyticsPageName: 'test-noname',
    version,
    isServiceWorkerCacheEnabled
  }
}
