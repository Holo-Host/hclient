/**
 * @module dpki-ultralite
 */

export const NONCEBYTES: Number = 24
export const SALTBYTES: Number = 16

const _sodium = require('libsodium-wrappers-sumo')
const util = require('./util')

exports.Keypair = require('./keypair').Keypair

for (let key in util) {
  exports[key] = util[key]
}
