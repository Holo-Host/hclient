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
 * Using this library to make a Holochain web UI Holo compatible is very easy provided you are already using hc-web-client
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

import {
  HolochainClient,
  MakeWebClientOptionals,
  WebsocketClient,
  Keypair,
  PostConnectFunction,
  PostCallFunction,
  PreCallFunction
} from './types'

const hClient = (function () {
  let keypair: Keypair
  let websocket: WebsocketClient
  let _happId: string

  let {
    generateReadonlyKeypair,
    generateNewReadwriteKeypair,
    regenerateReadwriteKeypair
  } = require('./keyManagement')

  const {
    showLoginDialog,
    insertLoginHtml,
    registerLoginCallbacks
  } = require('./login')

  const {
    getHashForUrl,
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
  const triggerLoginPrompt = async () => {
    const { email, password, newRegistration } = await showLoginDialog()
    return startLoginProcess(email, password, newRegistration)
  }

  /**
   * Start the local key generation/regeneration process with an email and password
   *
   * @param      {string}           email     The email
   * @param      {string}           password  The password
   * @param      {boolean}          newRegistration If true then register new salt with the saltservice otherwise try and regenerate existing keys
   * @memberof module:hClient
   */
  const startLoginProcess = async (email: string, password: string, newRegistration: string) => {
    let kp
    if (newRegistration) {
      console.log('Attempting to create new agent with email and salt service.')
      kp = await generateNewReadwriteKeypair(email, password)
    } else {
      console.log('Attempting to log-in agent in by restoring keys. - An existing registration should exist, otherwise a new one is created.')
      kp = await regenerateReadwriteKeypair(email, password)
    }
    console.log('keypair is ', kp)
    // NB: sendClientSignature will emit the `holo/clientSignature`` call to enovy (thus triggering the signature into the conductor via the wormhole.)
    await sendClientSignature(kp)
    await requestHosting()
    return true
  }

  /**
   * Wraps and returns a holochainClient module.
   * Keeps the same functionaltiy but adds preCall and postCall hooks and also forces
   * connect to go to a given URL. This is the essential requirement to holo-fy any holochain web UI.
   * @memberof module:hClient
   *
   * @param      {Object}    holochainClient       A hc-web-client module to wrap
   *
   * @param      {Object}    [optionals]           Non-required arguments
   * @param      {string}    [optionals.happId]    Override the happId; mostly for testing purposes. Defaults to using the hApp identifier that Holo has linked to this application (this is the HHA address of the entry storing the hApp bundle and happ DNS info).
   * @param      {string}    [optionals.hAppUrl]   Override the hAppUrl that is passed in the call to the resolver to get the host tranche (the associated DNS). Defaults to using window.location.origin
   * @param      {string}    [optionals.hostUrl]   Override the host tranche resolution process and call this host url directly. Defaults to calling the resolver with the resolverOrigin and using the first host URL it returns
   * @param      {Function}  [optionals.preCall]   The pre call funciton. Takes the callString and params and returns new callString and params.
   * Leave as default unless you know what you are doing.
   *
   * @param      {Function}  [optionals.postCall]  The post call function. Takes the response and returns the new response.
   * Leave as default unless you know what you are doing.
   *
   * @param      {Function}  [optionals.postConnect]  The post connect function.
   * Takes a RPC-websockets object and returns it preCall=preCall, postCall=postCall, postConnect=postConnect.
   * Leave as default unless you know what you are doing.
   */
  const makeWebClient = async (holochainClient: HolochainClient, optionals: MakeWebClientOptionals = {}) => {
    let hostUrl: string
    if (optionals.hostUrl === undefined) {
      const HappBundleDNS = optionals.hAppUrl || window.location.origin
      const HappBundleHash = optionals.happId || null
      hostUrl = await getHostForUrl(HappBundleDNS, HappBundleHash)
    } else {
      hostUrl = optionals.hostUrl
    }

    if (optionals.happId && optionals.happId !== undefined) {
      _happId = optionals.happId
    } else {
      const HappBundleDNS = optionals.hAppUrl || window.location.origin
      _happId = await getHashForUrl(HappBundleDNS)
    }

    const preCall = optionals.preCall || _preCall
    const postCall = optionals.postCall || _postCall
    const postConnect = optionals.postConnect || _postConnect

    return {
      connect: () => holochainClient.connect(hostUrl).then(async ({ call, close, ws }) => {
        ws = await postConnect(ws)
        return {
          call: (...callStringSegments: Array<string>) => async (params: any) => {
            const callString = callStringSegments.length === 1 ? callStringSegments[0] : callStringSegments.join('/')
            const { callString: newCallString, params: newParams } = await preCall(callString, params)
            return call(newCallString)(newParams).then(postCall)
          },
          callZome: (_instanceId: string, zome: string, func: string) => async (params: any) => {
            const callString = [_instanceId, zome, func].join('/')
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
   * Set overrides for the key generation function
   * Useful for testing or providing your own key management
   * @memberof module:hClient
   *
   * @param      {Object} keyManagementCallbacks
   * @param      {generateReadonlyKeypair} keyManagementCallbacks.generateReadonlyKeypair
   * @param      {generateNewReadwriteKeypair} keyManagementCallbacks.generateNewReadwriteKeypair
   * @param      {regenerateReadwriteKeypair} keyManagementCallbacks.regenerateReadwriteKeypair
   */
  const setKeyManagementFunctions = (overrides: any) => {
    if (overrides.generateReadonlyKeypair) {
      generateReadonlyKeypair = overrides.generateReadonlyKeypair
    }
    if (overrides.generateNewReadwriteKeypair) {
      generateNewReadwriteKeypair = overrides.generateNewReadwriteKeypair
    }
    if (overrides.regenerateReadwriteKeypair) {
      regenerateReadwriteKeypair = overrides.regenerateReadwriteKeypair
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
      return websocket.call('holo/agents/new', {
        agentId: await getCurrentAgentId(),
        happId: _happId
      })
    } else {
      throw Error('Cannot request registration with no websocket')
    }
  }

  /* =====  End of Public API Functions  ====== */

  /**
   * Calls the resolver with the given url and returns the first host in the tranche
   *
   * @return     {Object}  The websocket url to a host
   */
  const getHostForUrl = async (url: string, happId: string) => {
    const hosts = await getHostsForUrl(url)
    const hhaHappId = _happId || happId || await getHashForUrl(url)
    return 'ws://' + hhaHappId + '.' + hosts[0]
  }
  // const getDefaultWebsocketUrl = () => document.getElementsByTagName('base')[0].href.replace('http', 'ws')

  /**
   * Setter for the keypair
   * Attaches a new event listener on the websocket for the new agentID
   *
   * @param      {Keypair}  kp      dpki-lite keypair object to attach to the instance
   */
  const sendClientSignature = async (kp: Keypair) => {
    keypair = kp
    if (websocket) {
      const agentId = await getCurrentAgentId()
      await websocket.call('holo/identify', { agentId })

      // set up the websocket to sign on request
      // NOTE: Envoy triggers this call upon identifying the current agent and their DNA instance;
      // (ie once the correct chain to write to is located, THEN the signing sequence is triggred....)
      const event = `agent/${agentId}/sign`
      console.log('subscribing to event', event)

      websocket.subscribe(event)
      websocket.on(event, async ({ entry, id }: {entry: string, id: string}) => {
        console.log("signing the following entry with private keypair: ", entry)
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
  const _preCall: PreCallFunction = async (callString, params) => {
    if (!keypair) {
      throw new Error('trying to call with no keys')
    } else {
      // WARNING: The follow console will return ALL KEY DATA, including private keys and Uint8Arrays... TODO: REMOVE this console once debugging / review of keys is no longer necessary.
      // console.log('call will be signed with', keypair)

      console.log('hClient ACTION: Making call and signing with pub keypair.')

      const [instanceId, zome, funcName] = callString.split('/')
      // console.log('making call following instance id:', instanceId)
      const call = {
        method: callString,
        params
      }

      const signature = await keypair.sign(JSON.stringify(call))
      const signatureBase64 = await toBase64(signature)

      const callParams = {
        agentId: await getCurrentAgentId(),
        happId: _happId,
        instanceId,
        zome,
        function: funcName,
        args: params,
        signature: signatureBase64
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
  const _postCall: PostCallFunction = (response: string) => {
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
  const _postConnect: PostConnectFunction = async (ws) => {
    websocket = ws

    console.log('generating readonly keypair')
    const kp = await generateReadonlyKeypair()
    await sendClientSignature(kp)

    return ws
  }

  return {
    installLoginDialog,
    triggerLoginPrompt,
    startLoginProcess,
    makeWebClient,
    getCurrentAgentId,
    requestHosting,
    getHashForUrl,
    getHostsForUrl,
    setKeyManagementFunctions,
    keyManagement: require('./keyManagement'),
    dpkiUltralite: require('./dpki-ultralite')
  }
})()

module.exports = hClient
