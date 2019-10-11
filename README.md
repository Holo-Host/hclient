
[inc-doc]:  https://img.shields.io/badge/status-incomplete-yellow?style=flat-square "Incomplete"
[not-doc]:  https://img.shields.io/badge/status-not%20documented-red?style=flat-square "Not documented"
[old-doc]:  https://img.shields.io/badge/status-not%20documentation-yellow?style=flat-square "Outdated documentation"
[plan-doc]: https://img.shields.io/badge/status-incomplete-yellow?style=flat-square "Planned"
[ok-doc]:   https://img.shields.io/badge/status-documented-blue?style=flat-square "Documented"

# Holo Host - Web SDK ![](https://img.shields.io/badge/status-in%20progress-yellow?style=flat-square)

This Holo Hosting Web SDK is the only requirement for integrating a web UI with the Holo Hosting
infrastructure.

hApp developers can use this client against a Conductor with minimal configuration.  It is designed
so that testing against Holochain Conductor is virtually the same as testing in the Holo Hosting
infrastructure.

## API Reference ![][ok-doc]

[Documentation](./docs/module-holo-host_web-sdk.html)

## Testing

### Unit Tests

Waiting for development to start...

## Contributing

This project is written in **Typescript** and bundled with **Webpack**.

**Requirements**
- Node.js v12

Development and been tested on

- **Ubuntu 18.04**

All dependencies can be installed via `npm`
```bash
npm install
```

### Compile source

```bash
make build
```

### Compile and bundle

```bash
make dist
```

### Generate docs

```bash
make docs
```

## License

This project is licensed under the GPL-3 License - see the [LICENSE](LICENSE) file for details
