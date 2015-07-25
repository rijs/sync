#!/usr/bin/env node
var popper = require('popper')
  , serve  = require('rijs.serve')
  , core   = require('rijs.core')
  , data   = require('rijs.data')
  , css    = require('rijs.css')
  , fn     = require('rijs.fn')
  , sync   = require('./')
  
popper = popper({ 
  watch: ['src', 'test.js']
, port: 1945
, tests: tests()
, globals: globals() 
, browsers: browsers()
, ripple: ripple
})

popper.io.on('connection', function(socket){
  socket.on('beforeEach', function(){
    popper('foo'          , 'bar', headers())
    popper('object'       , { a:0 , b:1, c:2 }, headers())
    popper('array'        , [{i:0}, {i:1},{i:2}], headers())
    popper({ name: 'proxy', body: [{i:0}, {i:1},{i:2}], headers: { to: to, from: from, 'cache-control': 'no-cache', silent: true, reactive: false }})
    popper('my-component' , component, headers())
    popper.sync(socket)()
    socket.emit('done')
  })
})

function ripple(server) { 
  return serve(server), css(sync(data(fn(core())), server))
}

function headers(argument) {
  return { from: ack, silent: true, 'cache-control': 'no-cache' }
}

function ack(value, body, index, type, name) {
  return popper.sync(this)(name), false
}

function globals(){
  return '<script src="https://cdn.polyfill.io/v1/polyfill.min.js"></script>'
       + '<script src="https://cdnjs.cloudflare.com/ajax/libs/chai/3.0.0/chai.min.js"></script>'
}

function component(data) {  }

function from(val, body, key) {
  if (key != 'length') return;
  for (var i = 0; i < +val; i++) body[i] = { i: i }
  return ack.apply(this, arguments)
}

function to(d) {
  return { sum: d.reduce(sum, 0), length: d.length }
}

function sum(p, v){ 
  return p + v.i
}

function browsers() {
  return [
    'ie11'
  , 'chrome'
  , 'firefox'
  ]
}

function tests() {
  return '(npm run build > /dev/null) && browserify ./test.js'
       + ' -i colors'
       + ' -i chai'
       + ' | sed -E "s/require\\(\'chai\'\\)/window.chai/"'
       // + ' | uglifyjs'
}