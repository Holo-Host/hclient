/**
 * module resolver
 *
 * Interfaces with the holo resolver to locate the DNA or host tranche for a given URL.
 * This is not required in most cases where the UI is also hosted by Holo but in some cases
 * where the UI is hosted on the conventional web this is required to locate hosts.
 *
 */
const resolverUrl = 'http://resolver.holohost.net/'

const callResolver = (params: any) => {
  const body = Object.keys(params).map((key) => {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
  }).join('&')

  return fetch(resolverUrl, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body
  })
}

/**
 * Displays the login dialog and generates a new read/write key with the email/password
 * This will overwrite the current key
 * @memberof module:hClient
 */
const getHashForUrl = (DNS: string) => {
  return callResolver({ url: DNS })
    .then(r => r.json())
    .then(json => json.hash) // this is the HHA hAppHash
}

/**
 * Displays the login dialog and generates a new read/write key with the email/password
 * This will overwrite the current key
 * @memberof module:hClient
 */
const getHostsForUrl = (DNS: string) => {
  return callResolver({ url: DNS })
    .then(r => r.json())
    .then(json => json.hosts)
}

module.exports = {
  getHostsForUrl,
  getHashForUrl
}
