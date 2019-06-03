/**
 * keyManagement.js
 *
 * Deals with managing how keys generated with the salt server
 *
 */

const { Keypair, randomBytes, pwHash, fromBase64, toBase64 } = require('./dpki-ultralite')

let saltmineUrl = '//saltmine.holohost.net'

/**
 * Make a call to the saltmine API
 *
 * @param      {string}      method  The HTTP method e.g. "POST"
 * @param      {Object}      params  Parameter to pass in the body
 * @return     {Promise}     Promise that resolves to the reponse
 */
const callSaltmine = (method: string, params?: any): Promise<Response> => {
  console.log('params : ', params)
  let body
  if (method === 'GET' && !params) {
    body = undefined
  } else if (method === 'GET' && params) {
    body = undefined
    const email = params.email
    // encode the URI with the key/value pairs for GET call
    saltmineUrl = saltmineUrl + '?' + encodeURIComponent(email) + '=' + encodeURIComponent(params[email])
  } else {
    body = Object.keys(params).map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    }).join('&')
  }
  return fetch(saltmineUrl, {
    method: method,
    // mode: 'no-cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded' // Do not change or CORS will come and eat you alive (it does anyway!)
    },
    body: body
  })
}

/**
 * Use the saltmine to retrieve 32 bytes of entropy
 *
 * @return     {Uint8Array}  The remote entropy.
 */
const getRemoteEntropy = () => {
  return callSaltmine('GET')
    .then(r => r.text())
    .then(fromBase64)
      // @ts-ignore
    .then((buffer) => new Uint8Array(buffer).slice(0, 32))
}

/**
 * Register some salt with a given email address
 *
 * @param      {string}      email   The email
 * @param      {Uint8Array}  salt    The salt
 * @return     {Promise}     If successful will resolve to the same salt again
 */
const registerSalt = (email: string, salt: Uint8Array) => {
  return callSaltmine('POST', { email, salt })
    .then(r => r.text())
    .then(fromBase64)
      // @ts-ignore
    .then((buffer) => new Uint8Array(buffer).slice(0, 32))
}

/**
 * Gets the registered salt.
 *
 * @param      {string}      email   The email
 * @return     {Promise}  If successful will resolve to previously registered salt
 */
const getRegisteredSalt = (email: string) => {
  // Check to see if email is already registered and return salt if successful (therefore make a GET call instead of POST...).
  return callSaltmine('GET', { email })
    .then(r => r.text())
    .then(fromBase64)
      // @ts-ignore
    .then((buffer) => new Uint8Array(buffer).slice(0, 32))
}

/**
 * Generate 32 bytes of entropy locally using either webcrypto (preferred, unimplemented) or libsodium
 *
 * @return     {Uint8Array}  The local entropy.
 */
const getLocalEntropy = async () => {
  if (typeof window !== 'undefined' && window.crypto) {
    let array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    return array
  } else {
    console.log('Browser does not provide webcrypto. Falling back to libsodium (Warning: this may be less secure)')
    return randomBytes(32)
  }
}

/**
 * XOR two Uint8 arrays together.
 * Surely there is a better way to do this? This is the best I could find
 */
const XorUint8Array = (a: Uint8Array, b: Uint8Array) => {
  let r = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) {
    r[i] = a[i] ^ b[i]
  }
  return r
}

/**
 * Full workflow for generating a new readonly key pair
 *
 * @param    {function}    remoteEntropyGenerator
 * @param    {function}    localEntropyGenerator
 * @return     {Object}  The generated keypair object
 */
const generateReadonlyKeypair = async (
  remoteEntropyGenerator = getRemoteEntropy,
  localEntropyGenerator = getLocalEntropy
) => {
  const remoteEntropy = await remoteEntropyGenerator()
  const localEntropy = await localEntropyGenerator()
  const seed = XorUint8Array(remoteEntropy, localEntropy)
  const keypair = await Keypair.newFromSeed(seed)
  return keypair
}

/**
 * Full workflow for generating a new readwrite keypair given an email and password
 *
 * @param      {string}  email     The email
 * @param      {string}  password  The password
 * @param    {function}    remoteEntropyGenerator
 * @param    {function}    localEntropyGenerator
 * @param      {function} saltRegistrationCallback
 */
const generateNewReadwriteKeypair = async (
  email: string,
  password: string,
  remoteEntropyGenerator = getRemoteEntropy,
  localEntropyGenerator = getLocalEntropy,
  saltRegistrationCallback = registerSalt
) => {
  const remoteEntropy = await remoteEntropyGenerator()
  const localEntropy = await localEntropyGenerator()
  const saltBytes = XorUint8Array(remoteEntropy, localEntropy)
  const saltString = await toBase64(saltBytes)

  let registeredSalt
  try {
    registeredSalt = await saltRegistrationCallback(email, saltString)
  } catch (e) {
    console.error('could not register salt. Proceeding unregistered', e)
    registeredSalt = saltString
  }

  // Unsure why pwHash is configured to use 16 bytes of salt not 32. Ask about this
  const { hash } = await pwHash(password, registeredSalt.slice(0, 16))
  const keypair = await Keypair.newFromSeed(hash)
  return keypair
}

/**
 * Full workflow for restoring a keypair given a user has already registered salt for
 * the given email address
 *
 * @param      {string}  email     The email
 * @param      {string}  password  The password
 * @param      {function} getRegisteredSaltCallback
 * @return     {function}  The generated keypair object
 */
const regenerateReadwriteKeypair = async (
  email: string,
  password: string,
  getRegisteredSaltCallback = getRegisteredSalt
) => {
  try {
    const registeredSalt = await getRegisteredSaltCallback(email)

    if (registeredSalt) {
      const { hash } = await pwHash(password, registeredSalt.slice(0, 16))

      // TODO: DETERMINE IF THE HASH IS THE CORRECT HASH..
      // WARNING: Currently there is no check for the correct hash, which results in creating the A NEW AGENT keypair/ID rather than recreating the the current Agent's correct keypair/ID.
      const keypair = await Keypair.newFromSeed(hash)
      return keypair
    }
  } catch (e) {
    return console.error('No salt found. Unable to log in.', e)
  }
}

module.exports = {
  getRemoteEntropy,
  getLocalEntropy,
  generateReadonlyKeypair,
  generateNewReadwriteKeypair,
  regenerateReadwriteKeypair
}
