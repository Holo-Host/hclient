/* eslint-disable */

const _sodium = require('libsodium-wrappers-sumo')
const msgpack = require('msgpack-lite')
const util = require('./util')

const NONCEBYTES = 24

/**
 * Represents two asymmetric cryptography keypairs
 * - a signing keypair
 * - an encryption keypair
 *
 * base64url encoded identity string to represent the public sides
 *
 * can optionally be initialized without the private halves of the pairs
 */
class Keypair {
  /**
   * keypair constructor (you probably want one of the static functions above)
   * @param {object} opt
   * @param {string} opt.pubkeys - the keypair identity string
   * @param {Buffer} [opt.signPriv] - private signature key
   * @param {Buffer} [opt.encPriv] - private encryption key
   */
  constructor (opt) {
    if (
      typeof opt !== 'object' ||
      typeof opt.pubkeys !== 'string'
    ) {
      throw new Error('opt.pubkeys must be a base64 encoded pubkey pair (sign / enc)')
    }
    // console.log("CHECK: ",Buffer.isBuffer(opt.encPriv));
    if (opt.signPub) {
      if (opt.signPub.constructor !== Uint8Array) {
        throw new Error('if opt.signPub is specified, it must be a Buffer')
      }
    }
    if (opt.signPriv) {
      if (opt.signPriv.constructor !== Uint8Array) {
        throw new Error('if opt.signPriv is specified, it must be a Buffer')
      }
    }

    if (opt.encPub) {
      if (opt.encPub.constructor !== Uint8Array) {
        throw new Error('if opt.encPub is specified, it must be a Buffer')
      }
    }

    if (opt.encPriv) {
      if (opt.encPriv.constructor !== Uint8Array) {
        throw new Error('if opt.encPriv is specified, it must be a Buffer')
      }
    }

    this._pubkeys = opt.pubkeys
    this._signPub = opt.signPub
    this._encPub = opt.encPub
    this._signPriv = opt.signPriv
    this._encPriv = opt.encPriv
  }

  /**
   * derive the pairs from a 32 byte seed buffer
   * @param {Buffer} seed - the seed buffer
   */
  static newFromSeed (seed) {
    return new Promise((resolve, reject) => {
      _sodium.ready.then((_) => {
        const {
          publicKey: signPub,
          privateKey: signPriv
        } = _sodium.crypto_sign_seed_keypair(seed)
        const {
          publicKey: encPub,
          privateKey: encPriv
        } = _sodium.crypto_kx_seed_keypair(seed)
        util.encodeId(signPub, encPub).then(pubkeys => {
          resolve(new Keypair({
            pubkeys,
            signPub,
            signPriv,
            encPub,
            encPriv
          }))
          reject('failure reason')
        })
      })
    })
  }

  /**
   * get the keypair identifier string
   * @return {string}
   */
  getId () {
    return this._pubkeys
  }

  /**
   * sign some arbitrary data with the signing private key
   * @param {Buffer} data - the data to sign
   */
  sign (data) {
    if (!this._signPriv) {
      throw new Error('no signPriv - cannot sign data')
    }
    return new Promise((resolve, reject) => {
      _sodium.ready.then((_) => {
        resolve(_sodium.crypto_sign_detached(data, this._signPriv))
        reject('failure reason') // rejected
      })
    })
  }

  /**
   * verify data that was signed with our private signing key
   * @param {Buffer} signature
   * @param {Buffer} data
   */
  verify (signature, data) {
    return new Promise((resolve, reject) => {
      util.verify(signature, data, this._pubkeys).then((_) => {
        resolve(_)
        reject('failure reason') // rejected
      })
    })
  }
  /**
   * encrypt arbitrary data to be readale by potentially multiple recipients
   * @param {array<string>} recipientIds - multiple recipient identifier strings
   * @param {Buffer} data - the data to encrypt
   * @return {Buffer}
   */
  encrypt (recipientIds, data, adata) {
    var _this = this
    data = Buffer.from(data)

    return new Promise(function (resolve, reject) {
      _sodium.ready.then(function (_) {
        util.randomBytes(32).then(function (symSecret) {
          var out = []
          var flag = false
          return new Promise(function (resolve, reject) {
            var _loop = function _loop (i, p) {
              util.decodeId(recipientIds[i]).then(function (key) {
                return key.encPub
              }).then(function (recipPub) {
                // console.log("REC:: ",recipPub);
                var _sodium$crypto_kx_ser = _sodium.crypto_kx_server_session_keys(_this._encPub, _this._encPriv, recipPub)
                var tx = _sodium$crypto_kx_ser.sharedTx

                var nonce = _sodium.randombytes_buf(NONCEBYTES)
                var cipher = _sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(symSecret, adata || null, null, nonce, tx)
                out.push(nonce)
                out.push(cipher)
                if (i == recipientIds.length - 1) {
                  flag = true
                  resolve({
                    out: out,
                    symSecret: symSecret
                  })
                }
              })
              // XXX lru cache these so we don't have to re-gen every time?
            }

            for (var i = 0, p = Promise.resolve(); i < recipientIds.length; i++) {
              _loop(i, p)
            }
          })
        }).then(function (r) {
          var out = r.out
          var symSecret = r.symSecret
          var nonce = _sodium.randombytes_buf(NONCEBYTES)
          var cipher = _sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(data, adata || null, null, nonce, symSecret)
          out.push(nonce)
          out.push(cipher)
          resolve(msgpack.encode(out))
          reject('failure reason') // rejected
        })
      })
    })
  }

  /**
   * attempt to decrypt the cipher buffer (assuming it was targeting us)
   * @param {string} sourceId - identifier string of who encrypted this data
   * @param {Buffer} cipher - the encrypted data
   * @return {Buffer} - the decrypted data
   */
  decrypt (sId, cipher, adata) {
    cipher = msgpack.decode(cipher)
    return new Promise((resolve, reject) => {
      _sodium.ready.then((_) => {
        util.decodeId(sId).then(id => {
          // we will call the encryptor the "server"
          // and the recipient (us) the "client"
          // XXX cache?
          let sourceId = id.encPub
          const {
            sharedRx: rx
          } = _sodium.crypto_kx_client_session_keys(this._encPub, this._encPriv, sourceId)
          let symSecret = null
          for (let i = 0; i < cipher.length - 2; i += 2) {
            const n = cipher[i]
            const c = cipher[i + 1]
            try {
              symSecret = _sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, c, adata || null, n, rx)
            } catch (e) {
              /* pass */
            }
          }
          if (!symSecret) {
            reject(new Error('could not decrypt - not a recipient?'))
          } else {
            resolve(_sodium.to_string(_sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
              null, cipher[cipher.length - 1], adata || null, cipher[cipher.length - 2], symSecret)))
            reject('failure reason') // rejected
          }
        })
      })
    })
  }

  /**
   * generate an encrypted persistence bundle
   * @param {string} passphrase - the encryption passphrase
   * @param {string} hint - additional info / description for the bundle
   */
  getBundle (passphrase, hint) {
    if (typeof hint !== 'string') {
      throw new Error('hint must be a string')
    }

    return new Promise((resolve, reject) => {
      util.pwEnc(msgpack.encode([
        this._signPub, this._encPub,
        this._signPriv, this._encPriv
      ]), passphrase).then((data) => {
        resolve({
          type: 'hcKeypair',
          hint,
          data
        })
        reject('failure reason') // rejected
      })
    })
  }

  /**
   * initialize the pairs from an encrypted persistence bundle
   * @param {object} bundle - persistence info
   * @param {string} passphrase - decryption passphrase
   */
  static fromBundle (bundle, passphrase) {
    return new Promise((resolve, reject) => {
      util.pwDec(bundle.data, passphrase).then((encoded_bundle) => {
        bundle = msgpack.decode(encoded_bundle)
        util.encodeId(bundle[0], bundle[1]).then(pubkeys => {
          resolve(new Keypair({
            pubkeys,
            signPub: bundle[0],
            signPriv: bundle[2],
            encPub: bundle[1],
            encPriv: bundle[3]
          }))
          reject('failure reason')
        })
      })
    })
  }
}
exports.Keypair = Keypair
