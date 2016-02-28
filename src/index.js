// -------------------------------------------
// API: Synchronises resources between server/client
// -------------------------------------------
export default function sync(ripple, server){
  log('creating')
  
  if (!client && !server) return
  if (!client) values(ripple.types).map(headers(ripple))
  ripple.stream = stream(ripple)
  ripple.io = io(server)
  ripple.on('change', ripple.stream())                             // both   - broadcast change to everyone
  ripple.io.on('change', consume(ripple))                          // client - receive change
  ripple.io.on('connection', s => s.on('change', consume(ripple))) // server - receive change
  ripple.io.on('connection', s => ripple.stream(s)())              // server - send all resources to new client
  ripple.io.use(setIP)
  return ripple
}

// send diff to all or some sockets
const stream = ripple => sockets => (name, change) => {
  if (!name) return values(ripple.resources)
    .map(d => stream(ripple)(sockets)(d.name))

  const everyone = client ? [ripple.io] : ripple.io.of('/').sockets
      , res = ripple.resources[name]
      , send = to(ripple, change, res)
      , log = count(everyone.length, name)

  return header('silent', true)(res) ? delete res.headers.silent
       : is.str(sockets) ? (log(everyone.filter(by('sessionID', sockets)).map(send)), ripple)
       : !sockets        ? (log(everyone.map(send)), ripple)
                         : (log(send(sockets)), ripple)
}

// outgoing transforms
const to = (ripple, change, res) => socket => {
  const xres  = header('to')(res)
      , xtype = type(ripple)(res).to

  const body = xres 
             ? xres.call(socket, res, change) 
             : res.body
  if (!body) return false 

  const rep = xtype 
            ? xtype.call(socket, { name: res.name, body, headers: res.headers }, change)
            : { name: res.name, body, headers: res.headers }
  if (!rep) return false

  return socket.emit('change', change && (!xres || body === true)
    ? [res.name, change] 
    : [res.name, false, rep])
    , true
}

// incoming transforms
const consume = ripple => function([name, change, req]) {
  log('receiving', name)
  
  const socket = this
      , res    = ripple.resources[name]
      , xtype  = type(ripple)(res).from || type(ripple)(req).from
      , xres   = header('from')(res)
      , types  = ripple.types
      , next   = set(change)

  return !res  && !types[header('content-type')(req)] ? debug('req skip', name)  // rejected - corrupted
       : xtype && !xtype.call(socket, req, change)    ? debug('type skip', name) // rejected - by xtype
       : xres  && !xres.call(socket, req, change)     ? debug('res skip', name)  // rejected - by xres
       : !change     ? ripple(silent(req))                                       // accept - replace (new)
       : !change.key ? ripple(silent({ name, body: change.value }))              // accept - replace at root
                     : (silent(res), next(res.body))                             // accept - deep change
}

const count = (total, name) => tally => log(
  str((is.arr(tally) ? tally : [1]).filter(Boolean).length).green.bold + '/' 
+ str(total).green
, 'sending', name
)

const headers = ripple => type => {
  const parse = type.parse || noop 
  type.parse = function(res){
    const existing = ripple.resources[res.name]
        , from = header('from')(res) || header('from')(existing)
        , to   = header('to')(res)   || header('to')(existing)
    if (from) res.headers.from = from
    if (to)   res.headers.to   = to
    return parse.apply(this, arguments), res
  }
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

const silent = res => key('headers.silent', true)(res)

const type = ripple => res => ripple.types[header('content-type')(res)] || {}

import identity from 'utilise/identity'
import values from 'utilise/values'
import header from 'utilise/header'
import client from 'utilise/client'
import noop from 'utilise/noop'
import str from 'utilise/str'
import set from 'utilise/set'
import key from 'utilise/key'
import by from 'utilise/by'
import is from 'utilise/is'
import { diff } from 'jsondiffpatch'
const log = require('utilise/log')('[ri/sync]')
    , err = require('utilise/err')('[ri/sync]')
    , debug = log