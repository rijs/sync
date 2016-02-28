var core     = require('rijs.core').default
  , data     = require('rijs.data').default
  , sync     = require('./').default
  , includes = require('utilise/includes')
  , update   = require('utilise/update')
  , remove   = require('utilise/remove')
  , clone    = require('utilise/clone')
  , push     = require('utilise/push')
  , noop     = require('utilise/noop')
  , key      = require('utilise/key')
  , pop      = require('utilise/pop')
  , str      = require('utilise/str')
  , expect   = require('chai').expect
  , mockery  = require('mockery')
  , socket   = { emit: function(type, data){ return socket.emitted = emitted = [type, data]}, request: { headers: { 'x-forwarded-for': 10 }}}
  , other    = { emit: function(type, data){ return other.emitted = [type, data]}, request: { headers: {}, connection: { 'remoteAddress': 10 }} }
  , sockets, opts, emitted, connection, receive

describe('Sync', function(){

  before(function(){ 
    mockery.enable()
    mockery.registerMock('socket.io', sio)
  })

  beforeEach(function(){
    opts = emitted = socket.emitted = other.emitted = null
    sockets = [socket]
  })

  after(function(){ 
    mockery.disable()
  })

  it('should initialise correctly', function(){  
    expect(sync(data(core()))).to.be.not.ok

    expect(sync(data(core()), { foo: 'bar' })).to.be.ok
    expect(opts).to.be.eql({ foo: 'bar' })

    expect(sync(data(core()), { server: { foo: 'bar' }})).to.be.ok
    expect(opts).to.be.eql({ foo: 'bar' })
  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
    expect(ripple.io).to.be.ok
    expect(ripple.stream).to.be.a('function')
  })

  it('should stream new resource', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
    ripple('foo', { foo: 'bar' }) 
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'bar' }}]])
  })

  it('should stream change', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
    
    // new
    ripple('foo', { foo: 'bar' }) 
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'bar' }}]])
    expect(ripple.resources.foo.body).to.eql({ foo: 'bar' })

    // replace    
    ripple('foo', { foo: 'baz' }) 
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'baz' }}]])
    expect(ripple.resources.foo.body).to.eql({ foo: 'baz' })

    // diff
    update('foo', 'boo')(ripple('foo'))
    expect(emitted).to.eql(['change', ['foo', { key: 'foo', type: 'update', value: 'boo' }]])
    expect(ripple.resources.foo.body).to.eql({ foo: 'boo' })

    // deep diff
    update('bar.foo', 'wat')(ripple('foo'))
    expect(emitted).to.eql(['change', ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }]])
    expect(ripple.resources.foo.body).to.eql({ foo: 'boo', bar: { foo: 'wat' } })
  })

  it('should transform outgoing - block', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    // new
    ripple('foo', { foo: 'bar' }, { to: block }) 
    expect(emitted).to.be.not.ok
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(ripple.resources.foo)

    // replace
    ripple('foo', { foo: 'baz' })
    expect(emitted).to.be.not.ok
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(ripple.resources.foo)
  
    // diff
    update('foo', 'boo')(ripple('foo'))
    expect(emitted).to.be.not.ok
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(ripple.resources.foo)

    // deep diff
    update('bar.foo', 'wat')(ripple('foo'))
    expect(emitted).to.be.not.ok
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(ripple.resources.foo)

    function block(r, c) {
      return change = c
           , res = r
           , false
    }
  })

  it('should transform outgoing - pass through', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    // new
    ripple('foo', { foo: 'bar' }, { to: pass }) 
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'bar' }}]])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(ripple.resources.foo)

    // replace
    ripple('foo', { foo: 'baz' })
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'baz' }}]])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(ripple.resources.foo)
  
    // diff
    update('foo', 'boo')(ripple('foo'))
    expect(emitted).to.eql(['change', ['foo', { key: 'foo', type: 'update', value: 'boo' }]])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(ripple.resources.foo)

    // deep diff
    update('bar.foo', 'wat')(ripple('foo'))
    expect(emitted).to.eql(['change', ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }]])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(ripple.resources.foo)

    function pass(r, c) {
      return change = c
           , res = r
           , true
    }
  })

  it('should transform outgoing - arbitrary representation', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    // new
    ripple('foo', { foo: 'bar' }, { to: transform }) 
    expect(res).to.be.eql(ripple.resources.foo)
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(clone(emitted)).to.be.eql(['change', ['foo', false, {
      body: 3
    , headers: { 'content-type': 'application/data' }
    , name: 'foo'
    }]])

    // replace
    ripple('foo', { foo: 'bazoo' })
    expect(res).to.be.eql(ripple.resources.foo)
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bazoo' }})
    expect(clone(emitted)).to.be.eql(['change', ['foo', false, {
      body: 5
    , headers: { 'content-type': 'application/data' }
    , name: 'foo'
    }]])

    // diff
    update('foo', 'booo')(ripple('foo'))
    expect(res).to.be.eql(ripple.resources.foo)
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'booo' })
    expect(clone(emitted)).to.be.eql(['change', ['foo', false, {
      body: 4
    , headers: { 'content-type': 'application/data' }
    , name: 'foo'
    }]])

    // deep diff
    update('bar.foo', 'w')(ripple('foo'))
    expect(res).to.be.eql(ripple.resources.foo)
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'w' })
    expect(clone(emitted)).to.be.eql(['change', ['foo', false, {
      body: 1
    , headers: { 'content-type': 'application/data' }
    , name: 'foo'
    }]])
  
    function transform(r, c) {
      return change = c
           , res = r
           , r.body.bar ? r.body.bar.foo.length : r.body.foo.length
    }
  })

  it('should transform outgoing - for all resources of a type', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    // new
    ripple.types['application/data'].to = type
    ripple('foo', { foo: 'bar' }) 
    expect(emitted).to.not.be.ok
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(ripple.resources.foo)

    // replace
    ripple('foo', { foo: 'baz' })
    expect(emitted).to.not.be.ok
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(ripple.resources.foo)
  
    // diff
    update('foo', 'boo')(ripple('foo'))
    expect(emitted).to.not.be.ok
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(ripple.resources.foo)

    // deep diff
    update('bar.foo', 'wat')(ripple('foo'))
    expect(emitted).to.not.be.ok
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(ripple.resources.foo)

    function type(r, c) {
      return change = c
           , res = r
           , false
    }
  })

  it('should transform outgoing - for all resources of a type - pass through', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    // new
    ripple.types['application/data'].to = type
    ripple('foo', { foo: 'bar' }) 
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'bar' }}]])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(ripple.resources.foo)

    // replace
    ripple('foo', { foo: 'baz' })
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'baz' }}]])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(ripple.resources.foo)
  
    // diff
    update('foo', 'boo')(ripple('foo'))
    expect(emitted).to.eql(['change', ['foo', { key: 'foo', type: 'update', value: 'boo' }]])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(ripple.resources.foo)

    // deep diff
    update('bar.foo', 'wat')(ripple('foo'))    
    expect(emitted).to.eql(['change', ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }]])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(ripple.resources.foo)

    function type(r, c) {
      return change = c
           , res = r
           , true
    }
  })

  it('should transform outgoing - for all resources of a type', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    // new
    ripple.to = type
    ripple('foo', { foo: 'bar' }) 
    expect(emitted).to.not.be.ok
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(ripple.resources.foo)

    // replace
    ripple('foo', { foo: 'baz' })
    expect(emitted).to.not.be.ok
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(ripple.resources.foo)
  
    // diff
    update('foo', 'boo')(ripple('foo'))
    expect(emitted).to.not.be.ok
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(ripple.resources.foo)

    // deep diff
    update('bar.foo', 'wat')(ripple('foo'))
    expect(emitted).to.not.be.ok
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(ripple.resources.foo)

    function type(r, c) {
      return change = c
           , res = r
           , false
    }
  })

  it('should transform outgoing - for all resources of a type - pass through', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    // new
    ripple.to = type
    ripple('foo', { foo: 'bar' }) 
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'bar' }}]])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(ripple.resources.foo)

    // replace
    ripple('foo', { foo: 'baz' })
    expect(emitted).to.eql(['change', ['foo', { type: 'update', value: { foo: 'baz' }}]])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(ripple.resources.foo)
  
    // diff
    update('foo', 'boo')(ripple('foo'))
    expect(emitted).to.eql(['change', ['foo', { key: 'foo', type: 'update', value: 'boo' }]])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(ripple.resources.foo)

    // deep diff
    update('bar.foo', 'wat')(ripple('foo'))    
    expect(emitted).to.eql(['change', ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }]])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(ripple.resources.foo)

    function type(r, c) {
      return change = c
           , res = r
           , true
    }
  })

  it('should broacast all resources on connection', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , emitted = []

    ripple('foo', { foo: 'bar' }) 
    ripple('bar', { bar: 'foo' }) 
    ripple('baz', { baz: 'boo' }) 
    connection({ emit: function(){ emitted.push(clone(arguments)) }})
    
    expect(emitted).to.eql([ 
      { 0: 'change', 1: [ 'foo', false, { name: 'foo', headers: {'content-type': 'application/data'}, body: { foo: 'bar' }} ] }
    , { 0: 'change', 1: [ 'bar', false, { name: 'bar', headers: {'content-type': 'application/data'}, body: { bar: 'foo' }} ] }
    , { 0: 'change', 1: [ 'baz', false, { name: 'baz', headers: {'content-type': 'application/data'}, body: { baz: 'boo' }} ] } 
    ])
  })

  it('should broacast to specific sockets', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      
    ripple('foo', { foo: 'bar' }) 
    
    emitted = ''
    ripple.stream('sid')()
    expect(emitted).to.not.be.ok

    emitted = ''
    socket.sessionID = 'sid'
    ripple.stream('sid')()
    expect(emitted).to.be.eql(['change', ['foo', false, { name: 'foo', headers: {'content-type': 'application/data'}, body: { foo: 'bar' }}]])

    emitted = ''
    ripple.stream(socket)()
    expect(emitted).to.be.eql(['change', ['foo', false, { name: 'foo', headers: {'content-type': 'application/data'}, body: { foo: 'bar' }}]])
  })

  it('should consume change', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
    
    // new
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'bar' }}]) 
    expect(ripple.resources.foo).to.eql({ 
      name: 'foo'
    , body: { foo: 'bar' }
    , headers: { 'content-type': 'application/data' }
    })
    expect(emitted).to.be.not.ok

    // replace
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'baz' }}])
    expect(ripple.resources.foo.body).to.eql({ foo: 'baz' })
    expect(emitted).to.be.not.ok

    // diff
    receive.call(socket, ['foo', { key: 'foo', type: 'update', value: 'boo' }])
    expect(ripple.resources.foo.body).to.eql({ foo: 'boo' })
    expect(emitted).to.be.not.ok

    // deep diff
    receive.call(socket, ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }])
    expect(ripple.resources.foo.body).to.eql({ foo: 'boo', bar: { foo: 'wat' } })
    expect(emitted).to.be.not.ok
  })

  it('should consume change - transform for all - block', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    ripple.from = type

    // ignore
    receive.call(socket, ['foo', false, { name: 'foo', body: {}, headers: { 'content-type': 'application/data' }}])
    expect(change).to.be.eql(false)
    expect(res).to.be.eql({ name: 'foo', body: {}, headers: { 'content-type': 'application/data' }})
    expect(ripple.resources.foo).to.be.not.ok
    expect(emitted).to.be.not.ok
    ripple('foo'), emitted = ''

    // state of the world
    receive.call(socket, ['foo', false, { name: 'foo', body: {}, headers: { 'content-type': 'application/data' }}])
    expect(change).to.be.eql(false)
    expect(res).to.be.eql({ name: 'foo', body: {}, headers: { 'content-type': 'application/data' }})
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // new
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'bar' }}]) 
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // replace
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'baz' }}])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // diff
    receive.call(socket, ['foo', { key: 'foo', type: 'update', value: 'boo' }])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // deep diff
    receive.call(socket, ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    function type(r, c) {
      return change = c
           , res = r
           , false
    }
  })
 
  it('should consume change - transform for all - pass through', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    ripple.from = type

    // state of the world
    receive.call(socket, ['foo', false, { name: 'foo', body: { foo: 'bar' }, headers: { 'content-type': 'application/data' }}])
    expect(change).to.be.eql(false)
    expect(res).to.be.eql({ name: 'foo', body: { foo: 'bar' }, headers: { 'content-type': 'application/data' }})
    expect(ripple.resources.foo).to.be.eql(res)
    expect(emitted).to.be.not.ok

    // new
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'sth' }}]) 
    expect(change).to.be.eql({ type: 'update', value: { foo: 'sth' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'sth' })
    expect(emitted).to.be.not.ok

    // replace
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'baz' }}])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'baz' })
    expect(emitted).to.be.not.ok

    // diff
    receive.call(socket, ['foo', { key: 'foo', type: 'update', value: 'boo' }])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'boo' })
    expect(emitted).to.be.not.ok

    // deep diff
    receive.call(socket, ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'boo', bar: { foo: 'wat' } })
    expect(emitted).to.be.not.ok

    function type(r, c) {
      return change = c
           , res = r
           , true
    }
  })

  it('should consume change - type transform - block', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    ripple.types['application/data'].from = type

    // state of the world
    receive.call(socket, ['foo', false, { name: 'foo', body: {}, headers: { 'content-type': 'application/data' }}])
    expect(change).to.be.eql(false)
    expect(res).to.be.eql({ name: 'foo', body: {}, headers: { 'content-type': 'application/data' }})
    expect(ripple.resources.foo).to.not.be.ok
    expect(emitted).to.be.not.ok

    ripple('foo'), emitted = ''
    // new
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'bar' }}]) 
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // replace
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'baz' }}])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // diff
    receive.call(socket, ['foo', { key: 'foo', type: 'update', value: 'boo' }])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // deep diff
    receive.call(socket, ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    function type(r, c) {
      return change = c
           , res = r
           , false
    }
  })
 
  it('should consume change - type transform - pass through', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    ripple.types['application/data'].from = type

    // state of the world
    receive.call(socket, ['foo', false, { name: 'foo', body: { foo: 'bar' }, headers: { 'content-type': 'application/data' }}])
    expect(change).to.be.eql(false)
    expect(res).to.be.eql({ name: 'foo', body: { foo: 'bar' }, headers: { 'content-type': 'application/data' }})
    expect(ripple.resources.foo).to.be.eql(res)
    expect(emitted).to.be.not.ok

    // new
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'sth' }}]) 
    expect(change).to.be.eql({ type: 'update', value: { foo: 'sth' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'sth' })
    expect(emitted).to.be.not.ok

    // replace
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'baz' }}])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'baz' })
    expect(emitted).to.be.not.ok

    // diff
    receive.call(socket, ['foo', { key: 'foo', type: 'update', value: 'boo' }])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'boo' })
    expect(emitted).to.be.not.ok

    // deep diff
    receive.call(socket, ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'boo', bar: { foo: 'wat' } })
    expect(emitted).to.be.not.ok

    function type(r, c) {
      return change = c
           , res = r
           , true
    }
  })

  it('should consume change - res transform - block', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    ripple('foo', [], { from: block })
    emitted = ''

    // state of the world
    receive.call(socket, ['foo', false, { name: 'foo', body: {}, headers: { 'content-type': 'application/data' }}])
    expect(change).to.be.eql(false)
    expect(res).to.be.eql({ name: 'foo', body: {}, headers: { 'content-type': 'application/data' }})
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // new
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'bar' }}]) 
    expect(change).to.be.eql({ type: 'update', value: { foo: 'bar' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // replace
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'baz' }}])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // diff
    receive.call(socket, ['foo', { key: 'foo', type: 'update', value: 'boo' }])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    // deep diff
    receive.call(socket, ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql([])
    expect(emitted).to.be.not.ok

    function block(r, c) {
      return change = c
           , res = r
           , false
    }
  })
 
  it('should consume change - res transform - pass through', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
      , change, res

    ripple('foo', [], { from: pass })
    emitted = ''

    // state of the world
    receive.call(socket, ['foo', false, { name: 'foo', body: { foo: 'bar' }, headers: { 'content-type': 'application/data' }}])
    expect(change).to.be.eql(false)
    expect(clone(res)).to.be.eql({ name: 'foo', body: { foo: 'bar' }, headers: { 'content-type': 'application/data' }})
    expect(ripple.resources.foo).to.be.eql(res)
    expect(emitted).to.be.not.ok

    // new
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'sth' }}]) 
    expect(change).to.be.eql({ type: 'update', value: { foo: 'sth' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'sth' })
    expect(emitted).to.be.not.ok

    // replace
    receive.call(socket, ['foo', { type: 'update', value: { foo: 'baz' }}])
    expect(change).to.be.eql({ type: 'update', value: { foo: 'baz' }})
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'baz' })
    expect(emitted).to.be.not.ok

    // diff
    receive.call(socket, ['foo', { key: 'foo', type: 'update', value: 'boo' }])
    expect(change).to.be.eql({ key: 'foo', type: 'update', value: 'boo' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'boo' })
    expect(emitted).to.be.not.ok

    // deep diff
    receive.call(socket, ['foo', { key: 'bar.foo', type: 'update', value: 'wat' }])
    expect(change).to.be.eql({ key: 'bar.foo', type: 'update', value: 'wat' })
    expect(res).to.be.eql(undefined)
    expect(ripple.resources.foo.body).to.be.eql({ foo: 'boo', bar: { foo: 'wat' } })
    expect(emitted).to.be.not.ok

    function pass(r, c) {
      return change = c
           , res = r
           , true
    }
  })

  it('should ripple(!) changes', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
    sockets = [socket, other]

    receive.call(socket, ['foo', { type: 'update', value: { foo: 'bar' }}]) 
    expect(ripple.resources.foo.body).to.eql({ foo: 'bar' })
    expect(other.emitted).to.be.eql(['change', ['foo', { type: 'update', value: { foo: 'bar' }}]])
    expect(socket.emitted).to.be.not.ok
  })
 
  it('should not attempt to send non-existent resource', function(){  
    var ripple = sync(data(core()), { server: { foo: 'bar' }})   
    expect(ripple.resources.foo).to.not.be.ok
    ripple.stream()('foo')
    expect(emitted).to.be.not.ok
  })
 
  it('should set ip', function(){  
    sockets = [socket, other]
    var ripple = sync(data(core()), { server: { foo: 'bar' }})
    expect(socket.ip).to.be.eql(10)
    expect(other.ip).to.be.eql(10)
  })
  
})

function sio(o){
  opts = o
  return {
    use: function(fn){
      sockets.map(function(s){ fn(s, noop) })
    }
  , on: function(type, fn){
      if (type === 'change') receive = fn
      if (type === 'connection' && includes('change')(str(fn))) fn({ on: noop })
      if (type === 'connection') connection = fn
  }
  , of: function(){ return { sockets: sockets } }
  }
}