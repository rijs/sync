module.exports = function sync(
  ripple
, {} = {}
, { xrs = require('xrs/client') } = {}
){
  ripple.server = xrs()
  ripple.send = send(ripple)
  ripple.subscribe = subscribe(ripple)
  ripple.subscriptions = {}
  ripple.get = get(ripple)
  ripple.upload = upload(ripple)
  ripple.upload.id = 0

  // TODO: other than cache pushes? ans: use server.type
  ripple
    .server
    .on('recv')
    .map((data, i, n) => cache(ripple)(data, i, n))

  return ripple
}

const send = ({ server }) => (name, type, value) =>
  name instanceof Blob ? server.send(name, type)
: is.obj(name)         ? server.send(name)
                       : server.send({ name, type, value })

const get = ripple => (name, k) => ripple
  .subscribe(name, k)
  .filter((d, i, n) => n.source.emit('stop'))
  .start()

const cache = (ripple, n, k) => change => {
  if (name && change.name && name != change.name) ripple.link(name, change.name)
  const name = change.name = change.name || n
  if (!change.type) change.type = 'update'
  if (is.def(k)) change.key = `${k}.${str(change.key)}`
  !change.key && change.type == 'update'
    ? ripple(body(change))
    : set(change)(ripple.resources[name] ? ripple(name) : ripple(name, {}))

  ripple.change = change
  
  return key(k)(ripple(name))
}

const subscribe = ripple => (name, k) => {
  if (is.arr(name)) return merge(name.map(n => ripple.subscribe(n, k)))
    .map(d => name.reduce((p, v, i) => (p[v] = d[i], p), {}))

  ripple.subscriptions[name] = ripple.subscriptions[name] || {}
  if (is.arr(k)) return merge(k.map(k => ripple.subscribe(name, k)))
    .map(d => key(k)(ripple(name)))
  const output = emitterify().on('subscription')

  output
    .on('stop')
    .each((d, i, n) => {
      raw.subs.splice(raw.subs.indexOf(output), 1)
      time(1000, () => { 
        if (raw.subs.length) return
        raw.source.emit('stop')
        ripple.subscriptions[name][k] = undefined
        output.emit('end')
      })
    })

  if (ripple.subscriptions[name][k])
    output
      .on('start')
      .map(() => key(k)(ripple(name)))
      .filter(is.def)
      .map(initial => output.next(initial))

  const raw = ripple.subscriptions[name][k] = ripple.subscriptions[name][k] || ripple
    .send(name, 'SUBSCRIBE', k)
    .map(cache(ripple, name, k))
    .each(value => {
      [].concat(raw.subs).map(o => o.next(value))
      delete ripple.change
    })

  raw.subs = raw.subs || []
  raw.subs.push(output)
  
  return output
}

const upload = ripple => (name, form) => {
  let index = ++ripple.upload.id
    , fields = {}
    , size = 0
    , next = () => {
        if (!files.length) return true
        const { field, filename, i, blob } = files.shift()
        return ripple
          .send(blob, { filename, field, i, index })
          .on('progress', ({ received, total }) => output.emit('progress', {
            total: size
          , received: 
              size
            - (blob.size - received)
            - files.reduce((acc, d) => (acc += d.blob.size), 0)
          }))
          .then(next)
      }

  const files = keys(form)
    .map(field => (fields[field] = form[field], field))
    .filter(field => form[field] instanceof FileList)
    .map(field => { 
      fields[field] = []
      return to.arr(form[field])
        .map(f => (size += f.size, f))
        .map((f, i) => ({ field, filename: f.name, i, blob: f, sent: 0 }))
    })
    .reduce(flatten, [])

  const output = ripple.send({ 
    files: files.length
  , type: 'PREUPLOAD'
  , fields
  , index
  , size 
  , name
  }).once('sent', next)

  return output
}

const body = ({ name, value, headers }) => ({ name, headers, body: value })

const is = require('utilise/is')
    , to = require('utilise/to')
    , set = require('utilise/set')
    , not = require('utilise/not')
    , key = require('utilise/key')
    , str = require('utilise/str')
    , keys = require('utilise/keys')
    , time = require('utilise/time')
    , extend = require('utilise/extend')
    , values = require('utilise/values')
    , flatten = require('utilise/flatten')
    , emitterify = require('utilise/emitterify')
    , all = node => arr(document.querySelectorAll(node))
    , { min, pow } = Math
    , { assign } = Object
    , nametype = (name, type) => `(${name ? name + ', ' : ''}${type ? type : ''})`
    , stream = chunks => new require('stream').Readable({
        read(){
          this.push(chunks.length ? new Buffer(new Uint8Array(chunks.shift())) : null)
        }
      })

// TODO: factor out
const merge = streams => {
  const output = emitterify().on('merged')
  output.streams = streams

  streams.map((stream, i) => 
    stream.each(value => {
      stream.latest = value
      const latest = streams.map(d => d.latest)
      if (latest.every(is.def)) output.next(latest)
    })
  )

  output
    .once('start')
    .map(d => streams.map($ => $.source.emit('start')))

  output
    .once('stop')
    .map(d => streams.map($ => $.source.emit('stop')))

  return output
}
