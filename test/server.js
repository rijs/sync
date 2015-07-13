var serve  = require('serve-static')
  , app    = require('express')()
  , server = require('http').createServer(app)
  , core   = require('core')
  , data   = require('data')
  , sync   = require('../')
  , fn     = require('fn')
  , ripple = sync(data(fn(core())), server)

ripple.io.on('connection', function(socket){
  socket.on('beforeEach', function(){
    ripple('foo'          , 'bar', { silent: true })
    ripple('object'       , { a:0 , b:1, c:2 })
    ripple('array'        , [{i:0}, {i:1},{i:2}])
    ripple({ name: 'proxy', body: [{i:0}, {i:1},{i:2}], headers: { to: to, from: from }})
    ripple('my-component' , component)
    ripple.sync(socket)()
    socket.emit('done')
  })
})

server.listen(5000)
app.use(serve(__dirname + '/../'))
app.use(serve(__dirname + '/../test'))

function component(data) {  }

function from(val, body, key) {
  if (key != 'length') return;
  for (var i = 0; i < +val; i++) body[i] = { i: i }
  ripple('proxy').emit('change')
}

function to(d) {
  return { sum: d.reduce(sum, 0), length: d.length }
}

function sum(p, v){ 
  return p + v.i
}