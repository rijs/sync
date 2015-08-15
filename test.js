var expect   = require('chai').expect
  , debounce = require('utilise/debounce')
  , core     = require('rijs.core')
  , data     = require('rijs.data')
  , sync     = require('./')
  , ripple   = sync(data(core()))
  , temp
  
describe('Sync', function(){

  beforeEach(function(done){
    ripple.io.emit('beforeEach')
    ripple.io.once('done', debounce(done))
  })

  afterEach(function(){
    temp && ripple.io.off('change', temp)
  })

  it('should load resources on connection', function(){  
    expect(ripple('foo')).to.eql('bar')
  })

  it('should echo change for latency compensation', function(done){  
    ripple.once('change', function(){
      expect(ripple('foo')).to.eql('baz')
      done()
    })
    expect(ripple('foo', 'baz')).to.eql('baz')
  })

  it('should update data (array)', function(done){ 
    ripple('array')[2] = { i: 5 }
    ripple.io.once('change', temp = function(){ 
      expect(ripple('array')[0].i).to.eql(0)
      expect(ripple('array')[1].i).to.eql(1)
      expect(ripple('array')[2].i).to.eql(5)
      done() 
    })
    ripple('array').emit('change')
  })

  it('should push data (array)', function(done){ 
    ripple('array').push({ i: 3 })
    ripple.io.once('change', temp = function(){
      expect(ripple('array')[0].i).to.eql(0)
      expect(ripple('array')[1].i).to.eql(1)
      expect(ripple('array')[2].i).to.eql(2)
      expect(ripple('array')[3].i).to.eql(3)
      done() 
    })
    ripple('array').emit('change')
  })

  it('should remove data (array)', function(done){ 
    ripple('array').pop()
    ripple.io.once('change', temp = function(){ 
      expect(ripple('array')[0].i).to.eql(0)
      expect(ripple('array')[1].i).to.eql(1)
      expect(ripple('array')[2]).to.eql(undefined)
      done() 
    })
    ripple('array').emit('change')
  })

  it('should update data (object)', function(done){ 
    ripple('object').c = 5
    ripple.io.once('change', temp = function(){
      expect(ripple('object').a).to.eql(0)
      expect(ripple('object').b).to.eql(1)
      expect(ripple('object').c).to.eql(5)
      done() 
    })
    ripple('object').emit('change')
  })

  it('should push data (object)', function(done){ 
    ripple('object').d = 3
    ripple.io.once('change', temp = function(){
      expect(ripple('object').a).to.eql(0)
      expect(ripple('object').b).to.eql(1)
      expect(ripple('object').c).to.eql(2)
      expect(ripple('object').d).to.eql(3)
      done() 
    })
    ripple('object').emit('change')
  })

  it('should remove data (object)', function(done){ 
    delete ripple('object').c
    ripple.io.once('change', temp = function(){
      expect(ripple('object').a).to.eql(0)
      expect(ripple('object').b).to.eql(1)
      expect(ripple('object').c).to.eql(undefined)
      done() 
    })
    ripple('object').emit('change')
  })

  it('should proxy all data', function(done){ 

    expect(ripple('proxy').sum).to.eql(3)
    
    ripple('proxy').sum++    
    expect(ripple('proxy').sum).to.eql(4)
    expect(ripple('proxy').length).to.eql(3)

    ripple('proxy').length++
    expect(ripple('proxy').sum).to.eql(4)
    expect(ripple('proxy').length).to.eql(4)
    
    ripple('proxy').emit('change')

    ripple.io.once('change', temp = function(){
      expect(ripple('proxy').sum).to.eql(6)
      expect(ripple('proxy').length).to.eql(4)
      done()
    })
  })

  it('should deal with top-level changes', function(done){ 
    ripple.io.once('change', temp = function(){
      expect(ripple('object')).to.eql(['heh..'])
      done()
    })
    ripple('object', ['heh..'])
  })

  it('should receive one ack for one change, despite multiple changes', function(done){ 
    var counter = 0
    ripple('object', {219: { total: 0, me: false }})
    ripple.io.once('change', temp = function(){
      counter++
    })

    setTimeout(function(){
      expect(counter).to.be.eql(1)
      done()
    }, 150)
  })

  it('should deal with multiple deep changes at different levels', function(done){ 
    ripple('object', {219: { total: 0, me: false, x: { y: { z: 1 }}}})

    ripple.io.once('change', temp = function(){
      ripple('object', {219: { total: 1, me: true, x: { y: { z: 10 }}}})
      ripple.io.once('change', temp = function(){
        expect(ripple('object')).to.eql({219: { total: 1, me: true, x: { y: { z: 10 }}}})   
        done()
      })
    })
  })

})