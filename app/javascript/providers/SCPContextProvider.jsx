// Defined in version.txt, set via vite.config.ts
const version = __SCP_VERSION__

/**  wrapper around window.SCP to enumerate properties the React frontend expects from the server */
export function getSCPContext() {
  if (window.SCP) {
    window.SCP.version = version
    return window.SCP
  }
  return {
    userAccessToken: 'test',
    environment: 'test',
    analyticsPageName: 'test-noname',
    version
  }
}
