
const express = require('express')
const path = require('path')

// initialize a simple http server
const app = express()
app.use('/', express.static(path.join(__dirname, 'static')))
const server = require('http').createServer(app)
const WebSocketServer = require('rpc-websockets').Server

const port = 4000
let callbackId = 0

// serve the websocket on the same port
const wss = new WebSocketServer({ server })

wss.register('holo/identify', ({agentId}) => {
	try {
		wss.event(`agent/${agentId}/sign`)
	} catch (e) {
		console.log("tried to re-add the same event. Its ok we forgive you")
	}
	return { agentId }
})

wss.register('holo/agents/new', ({agentId}) => {
	return {success: true}
})

wss.register('holo/call', ({
  agentId, 
  happId, 
  dnaHash, 
  zome,
  function: func, 
  params,
  signature,
}) => {
	switch(func) {
		case "valid_function":
			return JSON.stringify({Ok: "Some response"})
		case "unauthorized_function":
			return JSON.stringify({Err: {code: 401}})
		case "needs_sig_function":
			wss.emit(`agent/${agentId}/sign`, {entry: "fake_entry_string", id: callbackId++})
			return JSON.stringify({Ok: true})
		default:
			return JSON.stringify({Err: "no such function"})
	}
})

wss.register('holo/clientSignature', ({signature, requestId}) => {
	return {success: true}
})


try {
	server.listen(port, () => {
	    console.log(`Server started on port ${server.address().port} :)`)
	})
} catch (e) {
	console.error(e)
}