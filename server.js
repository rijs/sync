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
  return ripple
}

const processor = ripple => async (req, res) => { 
  let reply
  return req.binary                       ? req.socket.uploads[req.data.meta.index].emit('file', req)
       : req.data.type == 'PREUPLOAD'     ? upload(ripple, req, res)
       : (reply = await xres(ripple, req, res)) ? reply
       : req.data.type == 'SUBSCRIBE'     ? subscribe(ripple, req, res) 
                                          : false
}

const xres = async (ripple, req, res) => {
  if (!(req.data.name in ripple.resources))
    await ripple.on('loaded')
      .filter(name => name == req.data.name)

  const resource = ripple.resources[req.data.name]
      , { from = noop } = resource.headers

  return from(req, res)
}

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
  .unpromise()

const upload = async (ripple, req, res) => {
  let uploads = req.socket.uploads = req.socket.uploads || {}
    , { name, index, fields, size } = req.data
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
      name
    , type: 'UPLOAD'
    , value: upload
    }
  }, res)
}

const subset = (target = '') => (source = '') => source.startsWith(target)

const by = require('utilise/by')
    , is = require('utilise/is')
    , key = require('utilise/key')
    , noop = require('utilise/noop')
    , header = require('utilise/header')
    , emitterify = require('utilise/emitterify')
    , nametype = (name, type) => `(${name ? name + ', ' : ''}${type ? type : ''})`