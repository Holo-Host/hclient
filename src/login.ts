/**
 * @module login
 */

const fs = require('fs')
const $ = require('jquery') // try and remove jquery in a refactor soon
let mode = 'signin'
/**
 * Inserts the login page in to the current document HTML.
 * It will be invisible and should not alter current page until
 * triggered to display
 */
const insertLoginHtml = function () {
  // this will be inlined by parcel
  let html = fs.readFileSync(__dirname + '/login/login.html')
  let cssMain = fs.readFileSync(__dirname + '/login/css/main.css')
  let cssUtil = fs.readFileSync(__dirname + '/login/css/main.css')

  let template = document.createElement('template')
  template.id = 'login-template'
  template.innerHTML = html

  document.body.appendChild(template)

  // this is the node of the object you wanted
  let documentFragment = template.content
  let templateClone = documentFragment.cloneNode(true)

  document.body.appendChild(templateClone) // this empty root now has your template

  let style = document.createElement('style')
  style.innerHTML = cssMain
  style.innerHTML += cssUtil
  template.appendChild(style)

  const modal = document.querySelector('.holo-dialog')
  modal.appendChild(style)
}

/**
 * Shows the login dialog.
 * @return     {Promise} returns a promise that resolves with the success/failure of the login
 */
const showLoginDialog = function () {
  return new Promise((resolve, reject) => {
    const modal: any = document.querySelector('.holo-dialog')
    modal.onSuccess = (email: string, password: string) => {
      const newRegistration = mode === 'signup'
      resolve({ email, password, newRegistration })
    }
    modal.onFailure = (email: string, password: string) => {
      reject(new Error('login did not validate'))
    }
    modal.showModal()
  })
}

/**
 * Registers all the functionality of the login dialog.
 * This must be on page load called for it to work
 */
const registerLoginCallbacks = function () {
  const dialogPolyfill = require('dialog-polyfill')

  const modal: any = document.querySelector('.holo-dialog')
  dialogPolyfill.registerDialog(modal)

  /* ==================================================================
    [ Validate ] */
  let input = $('.holo-login-form .input100')

  $('.tablinks').on('click', function (e: any) {
    e.preventDefault()
    mode = e.currentTarget.id
    $('.tabcontent').removeClass('activetab')
    $('.tablinks').removeClass('active')
    $('#' + mode + '-info').addClass('activetab')
    $('#' + mode).addClass('active')
  })

  $('.holo-login-form').on('submit', function (e: any) {
    e.preventDefault()

    let check = true

    for (let i = 0; i < input.length; i++) {
      if (validate(input[i]) === false) {
        showValidate(input[i])
        check = false
      }
    }

    console.log('success?: ', check)

    const email = $(input[0]).val()
    const password = $(input[1]).val()

    if (check) {
      console.log('starting keygen process with: ', email, password)
      modal.onSuccess(email, password)
      modal.close()
    } else {
      modal.onFailure(email, password)
    }

    return check
  })

  $('.holo-login-form .input100').each(function () {
    $(this).focus(function () {
      hideValidate(this)
    })
  })

  function validate (input: any) {
    if ($(input).attr('type') === 'email' || $(input).attr('name') === 'email') {
      if ($(input).val().trim().match(/^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{1,5}|[0-9]{1,3})(\]?)$/) == null) {
        return false
      }
    } else {
      if ($(input).val().trim() === '') {
        return false
      }
    }
  }

  function showValidate (input: any) {
    let thisAlert = $(input).parent()

    $(thisAlert).addClass('alert-validate')
  }

  function hideValidate (input: any) {
    let thisAlert = $(input).parent()

    $(thisAlert).removeClass('alert-validate')
  }
}

module.exports = {
  insertLoginHtml,
  registerLoginCallbacks,
  showLoginDialog
}
