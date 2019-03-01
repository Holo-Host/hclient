# hClient
is the client side library developers must import for their web UI to be Holo enabled. It includes the following functionality:
    - Key management and generation
        + Generating temporary readonly keys for browsing
        + Detecting when authorization is required and prompting the user to signup/login to generate read/write keys
    - Signing calls and responses
    - setting up a websocket connection to the interceptor to sign commits on request (the signing wormhole)
    -  Wrapping and unwrapping calls to and from the interceptor such that they look like regular holochain calls

hClient is designed so that UI developers do not need to make any extra considerations when developing for Holo or Holochain. A holochain app that uses hc-web-client can be converted to holo by calling

```javascript
const hClient = require("hClient");
const holochainClient = require("@holochain/hc-web-client");

holoClient = hClient.makeWebClient(window.holochainclient);
```

This will return an API compatible holoClient object to make calls with but will included all the relevent hooks to be holo enabled.

---

The final piece is the login modal. This can be injected into the app UI by calling

```
hClient.insertLoginHtml();
hClient.registerLoginCallbacks();
```

This has its own inline scoped CSS and should not interfere with the rest of the application. hClient is then able to trigger this modal to block any further user interaction until they are authenticated.

## Running tests

Before trying to run any tests the repo needs to be initialised with
```
# initialize the dpki-lite submodule
git submodule init 
git submodule update

# apply the patch for memlimit for now
cd ./dpki-lite.js
git apply ../dpki-lite.patch
npm install && npm run bootstrap

cd ..
npm install
```

### Unit tests

Unit tests exist for hClient and can be run using:
```
npm run test
```

These do not run in a browser environment

### Integration tests

The integration of hLoader and hLoader are tested with the resolver.holo.host and saltmine.holo.host set up as mocks. For true integration tests these mocks can be removed in the future. Run the ui-automation tests by running

```
cd integration_tests
npm install
npm run test
```

or instead of `npm run test` you can use `npm run test:runner` to use the interactive cypress test browser.