#!/usr/bin/env node
var popper   = require('popper')
  , serve    = require('rijs.serve').default
  , core     = require('rijs.core').default
  , data     = require('rijs.data').default
  , css      = require('rijs.css').default
  , fn       = require('rijs.fn').default
  , sync     = require('./').default
  , identity = require('utilise/identity')
  
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
    popper('foo'    , 'bar', headers())
    popper('helpers', { bar: 'bar' }, { silent: true, fn: { foo: foo }, 'cache-control': 'no-cache' })
    popper('object' , { a:0 , b:1, c:2 }, headers())
    popper('array'  , [{i:0}, {i:1},{i:2}], headers())
    popper('proxy'  , [{i:0}, {i:1},{i:2}], 
          { to: to, from: from, 'cache-control': 'no-cache', silent: true, reactive: false })
    popper.sync(socket)()
    socket.emit('done')
  })
})

function foo(){
  return 'foo'
}

function ripple(server) { 
  return serve(server), css(sync(data(fn(core())), server))
}

function headers(argument) {
  return { silent: true, 'cache-control': 'no-cache' }
}

function globals(){
  return '<script src="https://cdn.polyfill.io/v1/polyfill.min.js"></script>'
       + '<script src="https://cdnjs.cloudflare.com/ajax/libs/chai/3.0.0/chai.min.js"></script>'
}

function component(data) {  }

function from(val, body, key) {
  if (key != 'length') return;
  for (var i = 0; i < +val; i++) popper('proxy')[i] = { i: i }
  return true
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
       + ' | uglifyjs'
}