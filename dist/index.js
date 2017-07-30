// -------------------------------------------
// Synchronises resources between server/client
// -------------------------------------------
module.exports = function sync(ripple, ref){
  if ( ref === void 0 ) ref = {};
  var server = ref.server;
  var port = ref.port; if ( port === void 0 ) port = 3000;

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
    var app = require('express')()
        , server$1 = ripple.server = require('http').createServer(app) //uws.http.createServer(app)
        , ws = ripple.io = new (require('uws').Server)({ server: server$1 })

    ripple.server.express = app

    ws.on('connection', function (socket) {
      console.log("connection", socket)
      socket.send('Welcome to the 10s!')
    })

    ws.on('message', recv(ripple))
 
    server$1.listen(port, function (d) { return log('listening', server$1.address().port); })
  }
}

var recv = function (ripple) { return function (message) {
  console.log('recv', message)
}; }

var render = function (ripple) { return function (next) { return function (el) {}; }; }


var subscribe = function (ripple) { return function (name, keys) {
  if (!is.def(keys)) { return ripple.subscribe(name, ['']) }
  if (!is.arr(keys)) { return ripple.subscribe(name, [keys]) }

}; }

var send = function (ripple) { return function (req) {
  
}; }

var client = require('utilise/client')
    , is = require('utilise/is')
    , log = require('utilise/log')('[ri/sync]')
    , err = require('utilise/err')('[ri/sync]')