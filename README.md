# hClient

[![Build Status](https://travis-ci.org/Holo-Host/hClient.js.png)](https://travis-ci.org/Holo-Host/hClient.js)

For API documentation for the master branch visit https://holo-host.github.io/hClient.js/module-hClient.html

hClient is the client side library developers must import for their web UI to be Holo enabled. It includes the following functionality:
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
npm install
```

### Unit tests

Unit tests exist for hClient and can be run using:
```
npm run unit_test
```

These do not run in a browser environment

### Integration tests

The integration of hLoader and hLoader are tested with the resolver.holo.host and saltmine.holo.host set up as mocks. For true integration tests these mocks can be removed in the future. Run the ui-automation tests by running

```
npm run prepare:integration_tests
npm run integration_test
```

or instead of `npm run integration_test` you can use the following to run the integration tests in the interactive cypress test runner
```
npm run prepare:integration_tests
cd ./integration_tests
npm run test:runner
```

### Publishing

To publish a new release to npm use the following steps. Ensure you are on the master branch then run

- `npm version patch`
- `npm publish`

This will automatically build, lint, commit and push a new git tag before publishing. You can alternatively use `npm version major|minor|patch` to increment the correct version number. Please do not modify the version number in the package.json directly.

## Contributors

* **Willem Olding** - [github](https://github.com/willemolding)
* **Paul Hartzog** - [github](https://github.com/paulbhartzog-holo)

## License

This project is licensed under the GPL-3 License - see the [LICENSE](LICENSE) file for details
