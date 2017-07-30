// -------------------------------------------
// Synchronises resources between server/client
// -------------------------------------------
module.exports = function sync(ripple, { server, port = 3000 } = {}){
  if (client) {
    ripple.render = render(ripple)(ripple.render)
    ripple.subscribe = subscribe(ripple)
    ripple.io = new WebSocket(location.origin.replace('http', 'ws'))
    ripple.io.onopen = function (event) {
      console.log('onopen', event)
      // exampleSocket.send("Here's some text that the server is urgently awaiting!"); 
    }
    ripple.io.onclose = function (event) {
      console.log('onclose', event)
      // exampleSocket.send("Here's some text that the server is urgently awaiting!"); 
    }
    ripple.io.onerror = function (event) {
      console.log('onerror', event)
      // exampleSocket.send("Here's some text that the server is urgently awaiting!"); 
    }

    ripple.io.onmessage = function(data){
      console.log("recv", data)
    }
  } else {
    const app = require('express')()
        , server = ripple.server = require('http').createServer(app) //uws.http.createServer(app)
        , ws = ripple.io = new (require('uws').Server)({ server })

    ripple.server.express = app

    ws.on('connection', socket => {
      console.log("connection", socket)
      socket.send('Welcome to the 10s!')
    })

    ws.on('message', recv(ripple))
 
    server.listen(port, d => log('listening', server.address().port))
  }
}

const recv = ripple => message => {
  console.log('recv', message)
}

const render = ripple => next => el =>  {}


const subscribe = ripple => (name, keys) => {
  if (!is.def(keys)) return ripple.subscribe(name, [''])
  if (!is.arr(keys)) return ripple.subscribe(name, [keys])

}

const send = ripple => req => {
  
}

const client = require('utilise/client')
    , is = require('utilise/is')
    , log = require('utilise/log')('[ri/sync]')
    , err = require('utilise/err')('[ri/sync]')