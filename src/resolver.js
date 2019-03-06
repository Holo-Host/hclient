/**
 * resolver.js
 *
 * Interfaces with the holo resolver to locate the DNA or host tranche for a given URL.
 * This is not required in most cases where the UI is also hosted by Holo but in some cases
 * where the UI is hosted on the conventional web this is required to locate hosts.
 *
 */

const resolverUrl = 'http://resolver.holohost.net'

const callResolver = (params) => {
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

const getHostsForUrl = (url) => {
  return callResolver(url)
    .then(r => r.json())
    .then(json => json.hosts)
}

const getDnaForUrl = (url) => {
  return callResolver(url)
    .then(r => r.json())
    .then(json => json.dna)
}

module.exports = {
  getHostsForUrl,
  getDnaForUrl
}
