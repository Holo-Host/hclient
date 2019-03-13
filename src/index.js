/**
 * The javascript library for making your web UI Holo enabled!
 *
 * It handles:
 * - Key management and generation
 *   - Generating temporary readonly keys for browsing
 *   - Detecting when authorization is required and prompting the user to signup/login to generate read/write keys
 * - Signing calls and responses
 * - Setting up a websocket connection to the interceptor to sign commits on request
 * - Wrapping and unwrapping calls to and from the interceptor such that they look like regular holochain calls
 *
 * Using this library to make a Holochain web UI Holo compatible is very easy provide you are already using hc-web-client
 * to connect to holochain. In this case an app can be converted by adding the following lines to a page load function
 * ```javascript
 * let holochainclient = require('@holochain/hc-web-client') // this should already be part of your web UI
 * const hClient = require('hClient')
 *
 * holochainclient = hClient.makeWebClient(holochainclient) // overwrite the holochain client with the holo version
 * hClient.installLoginDialog() // add the optional login dialog (strongly reccomended)
 * ```
 *
 * The login dialog is required because for Holo the user must manage their own keys in the browser. This is unlike Holochain where they
 * are managed by the conductor. If the login dialog is installed hClient will automatically detect when a user is trying to take an action that
 * requires a keypair (such as making a commit) and modally display the login page. Completing the login will generate/regenerate the users keypair
 * that is stored in the browser.
 *
 * ![holo-login-dialog](./sign-in-to-holo-screen.png?raw=true "Login Dialog")
 *
 * @module hClient
 */

const hClient = (function () {
  let keypair
  let websocket

  const {
    generateReadonlyKeypair,
    generateNewReadwriteKeypair
    // regenerateReadwriteKeypair
  } = require('./keyManagement')

  const {
    showLoginDialog,
    insertLoginHtml,
    registerLoginCallbacks
  } = require('./login')

  const {
    getDnaForUrl,
    getHostsForUrl
  } = require('./resolver')

  const {
    toBase64
  } = require('./dpki-ultralite')

  const { Encoding } = require('@holochain/hcid-js')

  /* ============================================
  =            Public API Functions            =
  ============================================ */

  /**
   * Insert the HTML for the login dialog into the current document and register the callbacks
   * @method
   * @memberof module:hClient
   *
   * @return     {(Function|Object)}  { description_of_the_return_value }
   */
  const installLoginDialog = () => {
    insertLoginHtml()
    registerLoginCallbacks()
  }

  /**
   * Displays the login dialog and generates a new read/write key with the email/password
   * This will overwrite the current key
   * @memberof module:hClient
   */
  const triggerLoginPrompt = () => {
    showLoginDialog((email, password) => {
      startLoginProcess(email, password)
    })
  }

  /**
   * Start the local key generation/regeneration process with an email and password
   *
   * @param      {string}                    email     The email
   * @param      {string}                    password  The password
   * @memberof module:hClient
   */
  const startLoginProcess = (email, password) => {
    generateNewReadwriteKeypair(email, password).then(kp => {
      console.log('Registered keypair is ', kp)
      setKeypair(kp)
      requestHosting()
    })
  }

  /**
     * Wraps and returns a holochainClient module.
     * Keeps the same functionaltiy but adds preCall and postCall hooks and also forces
     * connect to go to a given URL. This is the essential requirement to holo-fy any holochain web UI.
     * @memberof module:hClient
     *
     * @param      {Object}    holochainClient A hc-web-client module to wrap
     * @param      {string}    [url]       The url to direct websocket calls. Defaults to the same location serving the UI but with the websocket protocol.
     * @param      {string}    [dnaHash]   Override the hash of the DNA that would usually be provided by the loader. Mostly for testing purposes
     * @param      {Function}  [preCall]   The pre call funciton. Takes the callString and params and returns new callString and params.
     * Leave as default unless you know what you are doing.
     *
     * @param      {Function}  [postCall]  The post call function. Takes the response and returns the new response.
     * Leave as default unless you know what you are doing.
     *
     * @param      {Function}  [postConnect]  The post connect function.
     * Takes a RPC-websockets object and returns it preCall=preCall, postCall=postCall, postConnect=postConnect.
     * Leave as default unless you know what you are doing.
     */
  const makeWebClient = async (holochainClient, url, dnaHash, preCall, postCall, postConnect) => {
    url = url || await getDefaultWebsocketUrl()
    dnaHash = dnaHash || await getDnaForUrl(window.location.origin)
    preCall = preCall || _preCall
    postCall = postCall || _postCall
    postConnect = postConnect || _postConnect

    return {
      connect: () => holochainClient.connect(url).then(async ({ call, close, ws }) => {
        ws = await postConnect(ws)
        return {
          call: (...callStringSegments) => async (params) => {
            const callString = callStringSegments.length === 1 ? callStringSegments[0] : callStringSegments.join('/')
            const { callString: newCallString, params: newParams } = await preCall(dnaHash, callString, params)
            return call(newCallString)(newParams).then(postCall)
          },
          close,
          ws
        }
      })
    }
  }

  /**
     * Gets the current agent identifier from the current key pair
     * @memberof module:hClient
     *
     * @return     {(Encoding|Object)}  The current agent identifier.
     */
  const getCurrentAgentId = async () => {
    if (keypair) {
      const enc = await new Encoding('hcs0')
      return enc.encode(keypair._signPub)
    } else {
      return undefined
    }
  }

  /**
   * Request that the Holo host currently serving the page sets up a local chain for the current keypair
   * @memberof module:hClient
   *
   */
  const requestHosting = async () => {
    if (websocket) {
      await websocket.call('holo/agents/new', { agentId: await getCurrentAgentId(), happId: 'simple-app' })
    } else {
      throw Error('Cannot request registration with no websocket')
    }
  }

  /* =====  End of Public API Functions  ====== */

  /**
   * Gets the default websocket url.
   *
   * @return     {Object}  The default websocket url.
   */
  const getDefaultWebsocketUrl = async () => {
    const hosts = await getHostsForUrl(window.location.origin)
    return 'ws://' + hosts[0]
  }
  // const getDefaultWebsocketUrl = () => document.getElementsByTagName('base')[0].href.replace('http', 'ws')

  /**
   * Setter for the keypair
   * Attaches a new event listener on the websocket for the new agentID
   *
   * @param      {Keypair}  kp      dpki-lite keypair object to attach to the instance
   */
  const setKeypair = async (kp) => {
    keypair = kp

    if (websocket) {
      const agentId = await getCurrentAgentId()
      await websocket.call('holo/identify', { agentId })
      // set up the websocket to sign on request
      const event = `agent/${agentId}/sign`
      console.log('subscribing to event', event)

      websocket.subscribe(event)
      websocket.on(event, async ({ entry, id }) => {
        const signature = await keypair.sign(entry)
        const signatureBase64 = await toBase64(signature)
        websocket.call('holo/clientSignature', {
          signature: signatureBase64,
          requestId: id
        })
      })
    } else {
      throw Error('Could not register callback as no valid websocket instance found')
    }
  }

  /**
     * Preprocesses the callString and params before making a call
     *
     * @param      {string}  callString  The call string e.g. dna/zome/function
     * @param      {Object}  params      The parameters
     * @return     {Object}  The updated callString and params passed to call
     */
  const _preCall = async (dnaHash, callString, params) => {
    if (!keypair) {
      throw new Error('trying to call with no keys')
    } else {
      console.log('call will be signed with', keypair)

      const call = {
        method: callString,
        params
      }

      const signature = await keypair.sign(JSON.stringify(call))

      const callParams = {
        agentId: await getCurrentAgentId(),
        happId: 'TODO',
        dnaHash,
        function: callString,
        params,
        signature
      }

      return { callString: 'holo/call', params: callParams }
    }
  }

  /**
     * Postprocess the response of a call before returning it to the UI
     *
     * @param      {string}  response  The response of the call
     * @return     {string}  Updated response
     */
  const _postCall = (response) => {
    console.log(response)

    // Check response for authentication error to see if login is required
    try {
      const responseJson = JSON.parse(response)
      if (responseJson.Err && responseJson.Err.code === 401) {
        triggerLoginPrompt()
      }
    } catch (e) {
      console.log(e)
    }

    // TODO: Sign the response and sent it back to the interceptor (check this is still required)
    // const responseSig = keypair.sign()

    return response
  }

  /**
     * Add any new callbacks to the websocket object or make calls immediatly after connecting
     *
     * @param      {Object}  ws      { rpc=websockets object }
     */
  const _postConnect = async (ws) => {
    websocket = ws

    console.log('generating readonly keypair')
    const kp = await generateReadonlyKeypair()
    await setKeypair(kp)

    return ws
  }

  return {
    installLoginDialog,
    triggerLoginPrompt,
    startLoginProcess,
    makeWebClient,
    getCurrentAgentId,
    requestHosting,
    getDnaForUrl,
    getHostsForUrl
  }
})()

module.exports = hClient
