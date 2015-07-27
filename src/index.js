// -------------------------------------------
// API: Synchronises resources between server/client
// -------------------------------------------
export default function sync(ripple, server){
  log('creating')
  
  values(ripple.types).map(headers(ripple))
  ripple.sync = emit(ripple)
  ripple.io = io(server)
  ripple.on('change', res => emit(ripple)()(res.name))
  ripple.io.on('change', silent(ripple))
  ripple.io.on('connection', s => s.on('change', change(ripple)))
  // ripple.io.on('connection', s => s.on('change', res => emit(ripple)()(res.name)))
  ripple.io.on('connection', s => emit(ripple)(s)())
  return ripple
}

function change(ripple){
  return function(req){
    log('receiving', req.name)
    
    var socket = this
      , res    = ripple.resources[req.name]

    if (!res) return log('no resource', req.name)
    if (!is.obj(res.body)) return silent(ripple)(req)

    var to     = header('proxy-to')(res) || identity
      , from   = header('proxy-from')(res)
      , body   = to.call(socket, key('body')(res))
      , deltas = diff(body, req.body)
  
    if (is.arr(deltas)) return delta('') 

    keys(deltas)
      .reverse()
      .filter(not(is('_t')))
      .map(flatten(deltas))
      .map(delta)

    function delta(k){
      
      var d     = key(k)(deltas)
        , name  = req.name
        , body  = res.body
        , index = k.replace(/_/g, '')
        , type  = d.length == 1 ? 'push'
                : d.length == 2 ? 'update'
                : d[2]    === 0 ? 'remove' 
                                : ''
        , value = type == 'update' ? d[1] : d[0]
        , next  = types[type]

        if (!type) return;
        if (!from || from.call(socket, value, body, index, type, name, next)) {
          if (!index) return silent(ripple)(req)
          next(index, value, body, name, res)
          // res.headers.silent = true
          ripple(name).emit('change')
        }
    }
  }
}

function flatten(base){
  return function(k){
    var d = key(k)(base)
    k = is.arr(k) ? k : [k]

    return is.arr(d) ? k.join('.')
         : flatten(base)(k.concat(keys(d)).join('.'))
  }
}

function push(k, value, body, name) {
  var path = k.split('.')
    , tail = path.pop()
    , o    = key(path.join('.'))(body) || body

  is.arr(o)
    ? o.splice(tail, 0, value) 
    : o[k] = value
}

function remove(k, value, body, name) {
  var path = k.split('.')
    , tail = path.pop()
    , o    = key(path.join('.'))(body) || body

  is.arr(o)
    ? o.splice(tail, 1) 
    : delete o[tail]
}

function update(k, value, body, name) {
  key(k, value)(body)
}

function headers(ripple){
  return type => {
    var parse = type.parse || noop 
    type.parse = function(res){
      if (client) return parse.apply(this, arguments), res
      var existing = ripple.resources[res.name]
        , from = header('proxy-from')(existing)
        , to = header('proxy-to')(existing)
        
      res.headers['proxy-from'] = header('proxy-from')(res) || header('from')(res) || from
      res.headers['proxy-to']   = header('proxy-to')(res)   || header('to')(res)   || to 
      return parse.apply(this, arguments), res
    }
  }
}

function silent(ripple) {
  return res => (res.headers.silent = true, ripple(res))
}

function io(opts){
  return !client ? require('socket.io')(opts.server || opts)
       : window.io ? window.io()
       : is.fn(require('socket.io-client')) ? require('socket.io-client')()
       : { on: noop, emit: noop }
}

// emit all or some resources, to all or some clients
function emit(ripple) {
  return function(socket){
    return function (name) {
      if (arguments.length && !name) return 
      if (!name) return values(ripple.resources)
                          .map(key('name'))
                          .map(emit(ripple)(socket))
                      , ripple

      var res = ripple.resources[name]
        , sockets = client ? [ripple.io] : ripple.io.of('/').sockets
        , lgt  = stats(sockets.length, name)
        , silent = header('silent', true)(res)

      return silent         ? delete res.headers.silent
           : !res           ? log('no resource to emit: ', name)
           : is.str(socket) ? lgt(sockets.filter(by('sessionID', socket)).map(to(res)))
           : !socket        ? lgt(sockets.map(to(res)))
                            : lgt([to(res)(socket)])
    }
  }
}

function to(res) {
  return function(socket){
    var fn = res.headers['proxy-to'] || identity
      , body = is.fn(res.body) ? '' + res.body : res.body
      , body = fn.call(socket, body)

    body && socket.emit('change', { 
      name: res.name
    , body
    , headers: res.headers 
    })

    return !!body
  }
}

function stats(total, name){
  return function(results){
    log(
      str(results.filter(Boolean).length).green.bold + '/' 
    + str(total).green
    , 'sending', name
    )
  }
}

import identity from 'utilise/identity'
import replace from 'utilise/replace'
import values from 'utilise/values'
import header from 'utilise/header'
import client from 'utilise/client'
import noop from 'utilise/noop'
import keys from 'utilise/keys'
import key from 'utilise/key'
import str from 'utilise/str'
import not from 'utilise/not'
import log from 'utilise/log'
import err from 'utilise/err'
import by from 'utilise/by'
import is from 'utilise/is'
import { diff } from 'jsondiffpatch'
log = log('[ri/sync]')
err = err('[ri/sync]')
var types = { push, remove, update }