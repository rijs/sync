// -------------------------------------------
// API: Synchronises resources between server/client
// -------------------------------------------
export default function sync(ripple, server){
  log('creating')
  
  if (!client && !server) return
  if (!client) 
    ripple.to = clean(ripple.to)
  , values(ripple.types).map(type => type.parse = headers(ripple)(type.parse))

  ripple.stream = stream(ripple)
  ripple.respond = respond(ripple)
  ripple.io = io(server)
  ripple.on('change.stream', ripple.stream())                      // both   - broadcast change to everyone
  ripple.io.on('change', consume(ripple))                          // client - receive change
  ripple.io.on('response', response(ripple))                       // client - receive response
  ripple.io.on('connection', s => s.on('change', consume(ripple))) // server - receive change
  ripple.io.on('connection', s => ripple.stream(s)())              // server - send all resources to new client
  ripple.io.use(setIP)
  return ripple
}

const respond = ripple => (socket, name, time) => reply => {
  socket.emit('response', [ name, time, reply ])
}

const response = ripple => function([ name, time, reply ]) {
  ripple.resources[name].body.emit('response._' + time, reply)
}

// send diff to all or some sockets
const stream = ripple => sockets => (name, change) => {
  if (!name) return values(ripple.resources)
    .map(d => stream(ripple)(sockets)(d.name))

  const everyone = client ? [ripple.io] : values(ripple.io.of('/').sockets)
      , log      = count(everyone.length, name)
      , res      = ripple.resources[name]
      , send     = to(ripple, res, change)

  return !res            ? (log('no resource', name))
       : is.str(sockets) ? (log(everyone.filter(by('sessionID', sockets)).map(send)), ripple)
       : !sockets        ? (log(everyone.map(send)), ripple)
                         : (log(send(sockets)), ripple)
}

// outgoing transforms
const to = (ripple, res, change) => socket => {
  if (header('silent', socket)(res)) return delete res.headers.silent, false
  
  var xres  = header('to')(res)
    , xtype = type(ripple)(res).to
    , xall  = ripple.to
    , body, rep, out

  body = res.body
  if (xres) {
    if (!(out = xres.call(socket, res, change))) return false
    if (out !== true) { change = false, body = out }
  }

  rep = { name: res.name, body, headers: res.headers }
  if (xtype) {
    if (!(out = xtype.call(socket, rep, change))) return false
    if (out !== true) change = false, rep = out
  }

  if (xall) {
    if (!(out = xall.call(socket, rep, change))) return false
    if (out !== true) change = false, rep = out
  }

  return socket.emit('change', change
    ? [res.name, change] 
    : [res.name, false, rep])
    , true
}

// incoming transforms
const consume = ripple => function([name, change, req = {}]) {
  log('receiving', name)
  
  const res     = ripple.resources[name]
      , xall    = ripple.from
      , xtype   = type(ripple)(res).from || type(ripple)(req).from // is latter needed?
      , xres    = header('from')(res)
      , next    = set(change)
      , silent  = silence(this)
      , respond = ripple.respond(this, name, change.time)

  return xall  &&  !xall.call(this, req, change, respond) ? debug('skip all' , name) // rejected - by xall
       : xtype && !xtype.call(this, req, change, respond) ? debug('skip type', name) // rejected - by xtype
       : xres  &&  !xres.call(this, req, change, respond) ? debug('skip res' , name) // rejected - by xres
       : !change     ? ripple(silent(req))                                  // accept - replace (new)
       : !change.key ? ripple(silent({ name, body: change.value }))         // accept - replace at root
                     : (silent(res), next(res.body))                        // accept - deep change
}

const count = (total, name) => tally => debug(
  str((is.arr(tally) ? tally : [1]).filter(Boolean).length).green.bold + '/' 
+ str(total).green
, 'sending', name
)

const headers = ripple => next => res => {
  const existing = ripple.resources[res.name]
      , from = header('from')(res) || header('from')(existing)
      , to   = header('to')(res)   || header('to')(existing)
  if (from) res.headers.from = from
  if (to)   res.headers.to   = to
  return next ? next(res) : res
}

const io = opts => {
  const r = !client ? require('socket.io')(opts.server || opts)
          : window.io ? window.io()
          : is.fn(require('socket.io-client')) ? require('socket.io-client')()
          : { on: noop, emit: noop }
  r.use = r.use || noop
  return r
}

const setIP = (socket, next) => {
  socket.ip = socket.request.headers['x-forwarded-for'] 
           || socket.request.connection.remoteAddress
  next()
}

const clean = next => function({ name, body, headers }, change){
  if (change) return next ? next.apply(this, arguments) : true

  const stripped = {}

  keys(headers)
    .filter(not(is('silent')))
    .map(header => stripped[header] = headers[header])

  return (next || identity).apply(this, [{ name, body, headers: stripped }, change])
}

import identity from 'utilise/identity'
import values from 'utilise/values'
import header from 'utilise/header'
import client from 'utilise/client'
import noop from 'utilise/noop'
import keys from 'utilise/keys'
import not from 'utilise/not'
import str from 'utilise/str'
import set from 'utilise/set'
import key from 'utilise/key'
import by from 'utilise/by'
import is from 'utilise/is'
const type = ripple => res => ripple.types[header('content-type')(res)] || {}
    , silence = socket => res => key('headers.silent', socket)(res)
    , log = require('utilise/log')('[ri/sync]')
    , err = require('utilise/err')('[ri/sync]')
    , debug = noop