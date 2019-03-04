require('babel-polyfill')
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

  const { showLoginDialog } = require('./login')

  /* ============================================
  =            Public API Functions            =
  ============================================ */
  // re-exports
  const {
    insertLoginHtml,
    registerLoginCallbacks
  } = require('./login')

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
      generateNewReadwriteKeypair(email, password).then(kp => {
        console.log('Registered keypair is ', kp)
        setKeypair(kp)
        requestHosting()
      })
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
  const makeWebClient = (holochainClient, url, preCall, postCall, postConnect) => {
    url = url || getDefaultWebsocketUrl()
    preCall = preCall || _preCall
    postCall = postCall || _postCall
    postConnect = postConnect || _postConnect

    return {
      connect: () => holochainClient.connect(url).then(({ call, close, ws }) => {
        ws = postConnect(ws)
        return {
          call: (...callStringSegments) => async (params) => {
            const callString = callStringSegments.length === 1 ? callStringSegments[0] : callStringSegments.join('/')
            const { callString: newCallString, params: newParams } = await preCall(callString, params)
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
  const getCurrentAgentId = () => {
    if (keypair) {
      return keypair.getId()
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
      websocket.call('holo/get-hosted', { agentId: getCurrentAgentId() })
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
  const getDefaultWebsocketUrl = () => document.getElementsByTagName('base')[0].href.replace('http', 'ws')

  /**
   * Setter for the keypair
   * Attaches a new event listener on the websocket for the new agentID
   *
   * @param      {Keypair}  kp      dpki-lite keypair object to attach to the instance
   */
  const setKeypair = async (kp) => {
    keypair = kp

    // set up the websocket to sign on request
    const event = `agent/${getCurrentAgentId()}/sign`

    if (websocket) {
      const response = await websocket.call('holo/identify', { agentId: getCurrentAgentId() })
      if (response.Ok) {
        websocket.subscribe(event)
        websocket.on(event, async ({ entry, id }) => {
          const signature = await keypair.sign(entry)
          websocket.call('holo/clientSignature', {
            signature,
            requestId: id
          })
        })
      }
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
  const _preCall = async (callString, params) => {
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
        agentId: getCurrentAgentId(),
        happId: 'TODO',
        dnaHash: 'TODO',
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
    response = JSON.parse(response)

    // Check response for authentication error to see if login is required
    if (response.Err && response.Err.code === 401) {
      triggerLoginPrompt()
    }

    // TODO: Sign the response and sent it back to the interceptor (check this is still required)
    // TODO: Unpack the response to expose to the UI code (make it look like a regular holochain call)

    return response
  }

  /**
     * Add any new callbacks to the websocket object or make calls immediatly after connecting
     *
     * @param      {Object}  ws      { rpc=websockets object }
     */
  const _postConnect = (ws) => {
    websocket = ws

    console.log('generating readonly keypair')
    generateReadonlyKeypair().then(kp => {
      setKeypair(kp)
    })

    return ws
  }

  return {
    installLoginDialog,
    triggerLoginPrompt,
    makeWebClient,
    getCurrentAgentId,
    requestHosting
  }
})()

module.exports = hClient
