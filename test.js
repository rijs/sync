var core     = require('rijs.core').default
  , data     = require('rijs.data').default
  , sync     = require('./').default
  , hashcode = require('utilise/hashcode')
  , includes = require('utilise/includes')
  , identity = require('utilise/identity')
  , promise  = require('utilise/promise')
  , update   = require('utilise/update')
  , remove   = require('utilise/remove')
  , clone    = require('utilise/clone')
  , falsy    = require('utilise/falsy')
  , push     = require('utilise/push')
  , noop     = require('utilise/noop')
  , keys     = require('utilise/keys')
  , time     = require('utilise/time')
  , not      = require('utilise/not')
  , key      = require('utilise/key')
  , pop      = require('utilise/pop')
  , str      = require('utilise/str')
  , log      = require('utilise/log')('')
  , is       = require('utilise/is')
  , arr      = require('utilise/to').arr
  , expect   = require('chai').expect
  , mockery  = require('mockery')
  , request  = { headers: { 'x-forwarded-for': '?' } }
  , socket, other, sockets, opts, connection

describe('Sync', function(){

  before(function(){ 
    mockery.enable()
    mockery.registerMock('socket.io', sio)
  })

  beforeEach(function(){
    socket = emit({ on: noop, request: { headers: { 'x-forwarded-for': 10 }}})
    other  = emit({ on: noop, request: { headers: {}, connection: { 'remoteAddress': 20 }} })
    opts   = null
  })

  after(function(){ 
    mockery.disable()
  })

  it('should initialise correctly', function(){  
    // no opts, no server
    expect(sync({})).to.be.eql({})
    expect(sync({}).io).to.be.not.ok

    // opts
    expect(sync(data(core()), { foo: 'bar' })).to.be.ok
    expect(opts).to.be.eql({ foo: 'bar' })

    // opts + server
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
    expect(opts).to.be.eql({ foo: 'bar' })
    expect(ripple.io).to.be.ok
    expect(ripple.send).to.be.a('function')
  })

  it('should send change', function(done){  
    to(done, null, null, null, [
      { name: 'foo', time: 0, type: 'update', value: { bar: 'baz' }, headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 1, type: 'update', value: { baz: 'four' }, headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 2, type: 'update', key: 'bar.foo', value: 'seven' }
    ])
  })

  it('should send change - resource', function(done){  
    to(done, hash, null, null, [
      { name: 'foo', time: 0, type: 'update', value: { hash: 1007607064 }, headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 1, type: 'update', value: { hash: -273689001 }, headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 2, type: 'update', key: 'bar.foo', value: { hash: 109330445  } }
    ])
  })

  it('should send change - type', function(done){  
    to(done, null, hash, null, [
      { name: 'foo', time: 0, type: 'update', value: { hash: 1007607064 }, headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 1, type: 'update', value: { hash: -273689001 }, headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 2, type: 'update', key: 'bar.foo', value: { hash: 109330445  } }
    ])
  })

  it('should send change - global', function(done){  
    to(done, null, null, hash, [
      { name: 'foo', time: 0, type: 'update', value: { hash: 1007607064 }, headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 1, type: 'update', value: { hash: -273689001 }, headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 2, type: 'update', key: 'bar.foo', value: { hash: 109330445  } }
    ])
  })

  it('should send change - block - resource', function(done){  
    to(done, falsy, null, null, [
      false
    , false
    , false
    ])
  })

  it('should send change - block - type', function(done){  
    to(done, null, falsy, null, [
      false
    , false
    , false
    ])
  })

  it('should send change - block - global', function(done){  
    to(done, null, null, falsy, [
      false
    , false
    , false
    ])
  })

  it('should await promise', function(done){  
    to(done, delay, delay, delay, [
      { name: 'foo', time: 0, type: 'update', value: '{"bar":"baz"}!!!', headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 1, type: 'update', value: '{"baz":"four"}!!!', headers: { 'content-type': 'application/data' } }
    , { name: 'foo', time: 2, type: 'update', key: 'bar.foo', value: 'seven!!!' }
    ])
  })

  it('should broacast all resources on connection', function(done){  
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , time = 0
        , type = 'update'
        , expected = [
            { name: 'foo', type, time, headers: {'content-type': 'application/data'}, value: { foo: 'bar' }}
          , { name: 'bar', type, time, headers: {'content-type': 'application/data'}, value: { bar: 'foo' }}
          , { name: 'baz', type, time, headers: {'content-type': 'application/data'}, value: { baz: 'boo' }}
          ]

    ripple('foo', { foo: 'bar' }) 
    ripple('bar', { bar: 'foo' }) 
    ripple('baz', { baz: 'boo' }) 
    ripple.io.connect(socket)
    emitted(expected)
      .then(done)
      .catch(console.error)
  })

  it('should broacast to specific sockets - sid fail', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , { send } = ripple
        , type = 'update'

    ripple('foo', { foo: 'bar' })
    ripple.io.connect(socket)

    time(10, d => {
      send('sid')()
      emitted([false])
        .then(done)
        .catch(console.error)
    })
  })

  it('should broacast to specific sockets - sid pass', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , { send } = ripple
        , type = 'update'

    ripple('foo', { foo: 'bar' })
    ripple.io.connect(socket)
    
    time(10, d => {
      socket.sessionID = 'sid'
      send('sid')()
      emitted([{ name: 'foo', value: { foo: 'bar' }, time: 0, type, headers: {'content-type': 'application/data' }}])
        .then(done)
        .catch(console.error)
    })
  })

  it('should broacast to specific sockets - socket', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , { send } = ripple
        , type = 'update'

    ripple('foo', { foo: 'bar' })
    ripple.io.connect(socket)
  
    time(10, d => {
      send(socket)()
      emitted([{ name: 'foo', value: { foo: 'bar' }, time: 0, type, headers: {'content-type': 'application/data' }}])
        .then(done)
        .catch(console.error)
    })
  })

  it('should consume change', function(done){
    from(done, null, null, null, [
      { bar: 'baz' }
    , { baz: 'four' }
    , { baz: 'four', bar: { foo: 'seven' } }
    ])
  })

  it('should consume change - block - resource', function(done){  
    from(done, falsy, null, null, [{}, {}, {}])
  })

  it('should consume change - block - type', function(done){  
    from(done, null, falsy, null, [{}, {}, {}])
  })

  it('should consume change - block - global', function(done){  
    from(done, null, null, falsy, [{}, {}, {}])
  })
 
  it('should consume change - resource', function(done){  
    from(done, hash, null, null, [
      { hash: 1007607064 }
    , { hash: -273689001 }
    , { hash: -273689001, bar: { foo: { hash: 109330445 } } }
    ])
  })

  it('should consume change - type', function(done){  
    from(done, null, hash, null, [
      { hash: 1007607064 }
    , { hash: -273689001 }
    , { hash: -273689001, bar: { foo: { hash: 109330445 } } }
    ])
  })

  it('should consume change - global', function(done){  
    from(done, null, null, hash, [
      { hash: 1007607064 }
    , { hash: -273689001 }
    , { hash: -273689001, bar: { foo: { hash: 109330445 } } }
    ])
  })

  it('should ripple(!) changes', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
    ripple.io.connect(socket)
    ripple.io.connect(other)

    socket.receive({ name: 'foo', time: 0, type: 'update', value: { bar: 'baz' }})
    expect(ripple.resources.foo.body).to.eql({ bar: 'baz' })
    emitted([{ name: 'foo', time: 0, type: 'update', value: { bar: 'baz' }, headers: { 'content-type': 'application/data'}}], other)
    emitted([])

    time(10, done)
  })

  it('should never send silent headers', function(done){  
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
    ripple.io.connect(socket)

    socket.receive.call({}, { name: 'foo', type: 'update', value: { bar: 'baz' }})
    emitted([{ name: 'foo', time: 0, type: 'update', value: { bar: 'baz' }, headers: { 'content-type': 'application/data'}}])
      .then(done)
      .catch(console.error)
  })
  
  it('should send/recv names with .', function(done){  
    sendrecv(
      done
    , ['foo.bar']
    , [[200, 'ok (foo.bar, update)']]
    , null
    , { name: 'foo.bar', body: 'baz' }
    )
  })

  it('should respond with custom response', function(done){  
    sendrecv(
      done
    , [{ name: 'foo' }]
    , [[999, 'ack']]
    , (req, res) => res(999, 'ack')
    )
  })

  it('should respond with custom response (shorthand)', function(done){  
    sendrecv(
      done
    , ['foo']
    , [[999, 'ack']]
    , (req, res) => res(999, 'ack')
    )
  })
 
  it('should respond with 200 on standard mutation', function(done){
    sendrecv(
      done
    , [{ name: 'foo', type: 'add', value: 'bar' }]
    , [[200, 'ok (foo, add)']]
    )
  })

  it('should respond with 200 on standard mutation (shorthand)', function(done){
    sendrecv(
      done
    , ['foo', 'add', 'bar']
    , [[200, 'ok (foo, add)']]
    )
  })

  it('should respond with 200 on standard mutation (new)', function(done){
    sendrecv(
      done
    , [{ name: 'foo', type: 'update', value: { bar: 'baz' } }]
    , [[200, 'ok (foo, update)']]
    )
  })

  it('should respond with 200 on standard mutation (new) (shorthand)', function(done){
    sendrecv(
      done
    , ['foo', 'update', { bar: 'baz' }]
    , [[200, 'ok (foo, update)']]
    )
  })

  it('should send all if no name', function(done){  
    sendrecv(
      done
    , [{}]
    , [[[200, 'ok (foo, update)']]]
    )
  })

  it('should send all if no name (shorthand)', function(done){  
    sendrecv(
      done
    , ['']
    , [[[200, 'ok (foo, update)']]]
    )
  })

  it('should not send if invalid name', function(done){  
    sendrecv(
      done
    , [{ name: 'invalid' }]
    , [404, 'cannot find invalid']
    )
  })

  it('should not send if invalid name (shorthand)', function(done){  
    sendrecv(
      done
    , ['invalid']
    , [404, 'cannot find invalid']
    )
  })

  it('should respond with 405 if type/verb not handled', function(done){  
    sendrecv(
      done
    , [{ name: 'foo', type: 'dance' }]
    , [[405, 'method not allowed']]
    )
  })

  it('should respond with 405 if type/verb not handled (shorthand)', function(done){  
    sendrecv(
      done
    , ['foo', 'dance']
    , [[405, 'method not allowed']]
    )
  })

  it('should catch errors (default to 500)', function(done){  
    sendrecv(
      done
    , ['foo']
    , [[500, 'WTF!']]
    , fail
    )

    function fail(req, res) {
      throw new Error('WTF!')
    }
  })

  it('should catch errors (default to 500)', function(done){  
    sendrecv(
      done
    , ['foo']
    , [[313, 'WTF!!']]
    , fail
    )

    function fail(req, res) {
      e = new Error('WTF!!')
      e.status = 313
      throw e
     }
  })

  it('should allow emitting custom event and return promise - single socket', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , { send } = ripple

    ripple('foo', [])
    send(socket)({ name: 'foo', type: 'update', value: ['bar'] }).then(replies => {
      expect(replies).to.be.eql([['reply 1']])
      emitted([{ name: 'foo', type: 'update', value: ['bar'], headers: { 'content-type': 'application/data'}}])
      done()
    }).catch(console.error)

    time(d => socket.ack('reply 1'))
  })

  it('should allow emitting custom event and return promise - multiple socket', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , { send } = ripple

    ripple('foo', [])
    send([socket, other])({ name: 'foo', type: 'update', value: ['bar'] }).then(replies => {
      expect(replies).to.be.eql([['reply 2'], ['reply 3']])
      emitted([{ name: 'foo', type: 'update', value: ['bar'], headers: { 'content-type': 'application/data'} }])
      emitted([{ name: 'foo', type: 'update', value: ['bar'], headers: { 'content-type': 'application/data'} }], other.emitted)
      done()
    }).catch(console.error)

    time(d => {
      socket.ack('reply 2')
      other.ack('reply 3')
    })
  })
  
  it('should set ip', function(){  
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
    ripple.io.connect(socket)
    ripple.io.connect(other)
    expect(socket.ip).to.be.eql(10)
    expect(other.ip).to.be.eql(20)
  })

  it('should be immutable req across sockets', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , { send } = ripple

    ripple.io.connect(socket)
    ripple.io.connect(other)
    ripple('foo', { foo: 5 }, { to })
    emitted([false])
    emitted([false], other)
    time(10, done)

    function to(req) {
      expect(req.value).to.eql({ foo: 5 })
      return false
    }
  })

  it('should allow sending req to self', function(){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , req = ripple.send(ripple)
        , increment = ({ name }) => ({ name, type: 'update', value: { counter: ripple('store').counter + 1 }})
        , decrement = ({ name }) => ({ name, type: 'update', value: { counter: ripple('store').counter - 1 }})
    
    ripple.io.connect(socket)

    ripple('store', { counter: 5 }, { from })
    expect(ripple('store')).to.eql({ counter: 5 })

    req('store', 'INCREMENT')
    req({ name: 'store', type: 'INCREMENT' })

    time(20, d => {
      emitted([{ name: 'store', value: { counter: 7 }, time: 2, type: 'update', headers: {'content-type': 'application/data' }}])
      expect(ripple('store')).to.eql({ counter: 7 })
      
      req('store', 'DECREMENT')
      req({ name: 'store', type: 'DECREMENT' })

      time(20, d => {
        emitted([{ name: 'store', value: { counter: 5 }, time: 4, type: 'update', headers: {'content-type': 'application/data' }}])
        expect(ripple('store')).to.eql({ counter: 5 })
      })
    })
    
    function from(req, res) {
      let counter = ripple('store').counter
        , { type } = req

      return type == 'INCREMENT' ? increment(req, res)
           : type == 'DECREMENT' ? decrement(req, res)
                                 : false
    }
  })

  it('should allow sending req to self and respond', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , { req } = ripple
        , replied = []

    ripple('store', { counter: 5 }, { from })
    
    req('store', 'VALID')
      .then(replies => replied.push(replies))
    
    time(10, d => 
      req('store', 'INVALID')
        .then(replies => replied.push(replies)))
    
    time(30, d => {
      expect(replied).to.be.eql([
        [[201, 'ok']]
      , [[501, 'not ok']]
      ])
      done()
    })

    function from(req, res) {
      return req.type == 'VALID' 
           ? res(201, 'ok')
           : res(501, 'not ok')
    }
  })

  it('should not send circular structure', function(done){
    const ripple = sync(data(core()), { server: { foo: 'bar' }})
        , a = {}
    
    a.b = a
    ripple.io.connect(socket)
    ripple('circular', a)
    emitted([])
      .then(done)
      .catch(console.error)
  })

})

function sio(o){
  opts = o
  let sockets = []
    , use = []
    , connect

  return {
    use: fn => use.push(fn)
  , connect: s => {
      s.on = (type, fn) => type == 'change' && (s.receive = fn)
      sockets.push(s)
      use.map(fn => fn(s, noop))
      connect(s)
    }
  , on: function(type, fn){
      if (type === 'connection') connect = fn 
  }
  , of: d => ({ sockets: sockets })
  }
}

function emitted(records, s = socket) {
  const p = promise()

  s.emitted = !records.filter(Boolean).length
  ? d => { throw new Error("should not have been called") }
  : sent => {
      const expected = records.shift()
      
      if (!expected) return expect(sent).to.be.not.ok
      const actual = sent[1]
      expect(sent[0]).to.eql('change')
      expect(sent[2]).to.be.a('function')
      if (expected.headers) {
        expect(actual.headers['content-type']).to.eql(expected.headers['content-type'])
        expect(actual.headers.silent).to.eql(expected.headers.silent)
      } else {
        expect(actual.headers).to.be.not.ok
      }

      keys(actual)
        .filter(not(is('socket')))
        .filter(not(is('headers')))
        .map(k => expect(actual[k]).to.be.eql(expected[k]))

      keys(expected)
        .filter(not(is('headers')))
        .map(k => expect(actual[k]).to.be.eql(expected[k]))

      !records.length && p.resolve()
    }

  if (!records.filter(Boolean).length) time(10, d => p.resolve())
  return p
}

function to(done, res, typ, all, expected) {
  const ripple = sync(data(core()), { server: { foo: 'bar' }})
      , headers = {}

  ripple.io.connect(socket)
  if (res) headers.to = transform(headers.to)(res)
  if (typ) ripple.types['application/data'].to = transform(ripple.types['application/data'].to)(typ)
  if (all) ripple.to = transform(ripple.to)(all)

  // new
  ripple('foo', { bar: 'baz' }, headers) 

  // replace
  ripple('foo', { baz: 'four' })

  // deep diff
  update('bar.foo', 'seven')(ripple('foo'))

  emitted(expected)
    .then(done)
    .catch(console.error)
}

const transform = next => fn => req => {
  expect('name'   in req).to.be.ok
  expect('type'   in req).to.be.ok
  expect('time'   in req).to.be.ok
  expect('value'  in req).to.be.ok
  expect('socket' in req).to.be.ok
  return fn((next || identity)(req))
}

function from(done, res, typ, all, expected) {
  const ripple = sync(data(core()), { server: { foo: 'bar' }})
      , headers = {}

  ripple.io.connect(socket)
  if (res) headers.from = transform(res)
  if (typ) ripple.types['application/data'].from = transform(typ)
  if (all) ripple.from = transform(all)

  ripple('foo', {}, headers) 
  
  time(10, d => {
    // new
    socket.receive({ name: 'foo', time: 0, type: 'update', value: { bar: 'baz' }}, ack)
    expect(ripple.resources.foo.name).to.eql('foo')
    expect(ripple.resources.foo.body).to.eql(expected[0]) 
    expect(ripple.resources.foo.headers['content-type']).to.eql('application/data')

    // replace
    socket.receive({ name: 'foo', time: 1, type: 'update', value: { baz: 'four' }}, ack)
    expect(ripple.resources.foo.name).to.eql('foo') 
    expect(ripple.resources.foo.body).to.eql(expected[1]) 
    expect(ripple.resources.foo.headers['content-type']).to.eql('application/data')

    // deep diff
    socket.receive({ name: 'foo', time: 2, type: 'update', value: 'seven', key: 'bar.foo' }, ack)
    expect(ripple.resources.foo.name).to.eql('foo') 
    expect(ripple.resources.foo.body).to.eql(expected[2]) 
    expect(ripple.resources.foo.headers['content-type']).to.eql('application/data')
    
    emitted([])
      .then(done)
      .catch(console.error)
  })

  function transform(fn) {
    return function(req, res) {
      expect('name'   in req).to.be.ok
      expect('type'   in req).to.be.ok
      expect('time'   in req).to.be.ok
      expect('value'  in req).to.be.ok
      expect('socket' in req).to.be.ok
      expect(res).to.be.a('function')
      expect(arguments.length).to.be.eql(2)
      return fn(req)
    }
  }

  function ack(status, message) {
    expect(status).to.be.eql(200)
    expect(message).to.be.eql('ok (foo, update)')
  }
}

function delay(req) {
  const p = promise()
  time(10, d => { 
    req.value = str(req.value) + '!'
    p.resolve(req)
  })
  return p
}

function hash(req) {
  req.value = { hash: hashcode(str(req.value)) }
  return req
}

function sendrecv(done, args, expected, from, resources) {
  const server = sync(data(core()), { server: { foo: 'bar' }})
      , client = sync(data(core()), { server: { foo: 'bar' }})
 
  socket.emit = (type, req, res) =>  other.receive(clone(req), clone(res))
  other.emit  = (type, req, res) => socket.receive(clone(req), clone(res))

  server.io.connect(socket)
  client.io.connect(other)

  server('foo', [], (from ? { from } : {}))
  server(resources)

  time(10, d => {
    expect(server.resources.foo).to.be.ok
    expect(client.resources.foo).to.be.ok
    client.send().apply({}, args)
      .then(response)
      .catch(console.error)
  })

  function response(reply) {
    expect(reply).to.be.eql(expected)
    done()
  }

}

function emit(socket){ 
  socket.emit = function() {
    socket.ack = arguments[2]
    socket.emitted && socket.emitted(arr(arguments))
  }

  return socket
}