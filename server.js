// -------------------------------------------
// Synchronises resources between server/client
// -------------------------------------------
module.exports = function sync(
  ripple
, { server
  , certs
  , port = 5000
  } = {}
, { xrs = require('xrs/server')
  } = {}
){
  ripple.server = xrs({ 
    processor: processor(ripple)
  , certs
  , port 
  }, { http: server })
  ripple.from = xall(ripple)
  return ripple
}

const processor = ripple => (req, res) => { 
  // if (!(req.data.name in ripple.resources))
  //   return res(err('not found', req.data))
  const resource = ripple.resources[req.data.name]
      , xres     = key('headers.from')(resource) || identity
      , xtyp     = key(`types.${key('headers.content-type')(resource)}.from`)(ripple) || identity
      , xall     = ripple.from || identity
      
  return xall(xtyp(xres(req, res), res), res)
}

const xall = ripple => (req = {}, res) =>
  (!req || !req.data)          ? req
: req.binary                   ? req.socket.uploads[req.data.meta.index].emit('file', req)
: req.data.type == 'SUBSCRIBE' ? subscribe(ripple, req, res) 
: req.data.type == 'PREUPLOAD' ? upload(ripple, req, res)
                               : req

const subscribe = (ripple, req, res) => ripple
  .on('change')
  .on('start', () => { 
    const { body, headers } = ripple.resources[req.data.name] || {}
    res(req.data.value
      ? { type: 'update', key: req.data.value, value: key(req.data.value)(body) }
      : { type: 'update', value: body, headers }
    )
  })
  .filter(([name]) => name == req.data.name)
  .map(d => d[1])
  .filter(by('key', subset(req.data.value)))
  
const upload = async (ripple, req, res) => {
  let uploads = req.socket.uploads = req.socket.uploads || {}
    , { resource, index, fields, size } = req.data
    , upload = emitterify(uploads[index] = fields)

  if (size) await upload
    .on('file')
    .map(file => (upload[file.data.meta.field][file.data.meta.i] = file.binary, file))
    .reduce(((received = 0, file) => received += file.size))
    .filter(received => received == size)
    
  delete uploads[index]

  return processor(ripple)({ 
    socket: req.socket
  , data: {
      name: resource
    , type: 'UPLOAD'
    , value: upload
    }
  }, res)
}

const subset = (target = '') => (source = '') => source.startsWith(target)

const by = require('utilise/by')
    , is = require('utilise/is')
    , key = require('utilise/key')
    // , log = require('utilise/log')('[ri/sync]')
    // , err = require('utilise/err')('[ri/sync]')
    // , deb = require('utilise/deb')('[ri/sync]')
    , header = require('utilise/header')
    , identity = require('utilise/identity')
    , emitterify = require('utilise/emitterify')
    , nametype = (name, type) => `(${name ? name + ', ' : ''}${type ? type : ''})`