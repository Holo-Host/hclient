/**
 *
 * Interfaces with the browser local store to persist keybundles and host addresses
 *
 * The local store schema is as follows:
 * ```javascript
 * localStorage: {
 *     <hAppId>: {
 *         <hostAddress>: {keyBundle: <bundle object>, canWrite: true|false},
 *         ... other hosts for this hApp
 *     },
 *     ... other hApps
 * }
 * ```
 *
 * Host addresses are stored with the keyBundle that has been used on that host (if any).
 * There should be only a single active key pair used per host which may be readonly.
 * @module persistence
 */

const storeHosts = (hAppId, hostAddresses, canWrite) => {
  try {
    hostAddresses.map((hostAddress) => {
      localStorage[hAppId][hostAddress] = { keyBundle: undefined }
    })
  } catch (e) {
    console.err(e)
    throw e
  }
}

const loadHosts = (hAppId, writeAccess) => {
  return []
}

module.exports = {
  storeHosts,
  loadHosts
}
