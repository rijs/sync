var expect   = require('chai').expect
  , debounce = require('utilise/debounce')
  , core     = require('rijs.core')
  , data     = require('rijs.data')
  , sync     = require('./')
  , ripple   = sync(data(core()))
  
describe('Sync', function(){

  beforeEach(function(done){
    ripple.io.emit('beforeEach')
    ripple.io.once('done', debounce(done))
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
    ripple('array').emit('change')
    ripple('array').once('change', function(){ 
      expect(ripple('array')[0].i).to.eql(0)
      expect(ripple('array')[1].i).to.eql(1)
      expect(ripple('array')[2].i).to.eql(5)
      done() 
    })
  })

  it('should push data (array)', function(done){ 
    ripple('array').push({ i: 3 })
    ripple('array').emit('change')
    ripple('array').once('change', function(){ 
      expect(ripple('array')[0].i).to.eql(0)
      expect(ripple('array')[1].i).to.eql(1)
      expect(ripple('array')[2].i).to.eql(2)
      expect(ripple('array')[3].i).to.eql(3)
      done() 
    })
  })

  it('should remove data (array)', function(done){ 
    ripple('array').pop()
    ripple('array').emit('change')
    ripple('array').once('change', function(){ 
      expect(ripple('array')[0].i).to.eql(0)
      expect(ripple('array')[1].i).to.eql(1)
      expect(ripple('array')[2]).to.eql(undefined)
      done() 
    })
  })

  it('should update data (object)', function(done){ 
    ripple('object').c = 5
    ripple('object').emit('change')
    ripple('object').once('change', function(){ 
      expect(ripple('object').a).to.eql(0)
      expect(ripple('object').b).to.eql(1)
      expect(ripple('object').c).to.eql(5)
      done() 
    })
  })

  it('should push data (object)', function(done){ 
    ripple('object').d = 3
    ripple('object').emit('change')
    ripple('object').once('change', function(){ 
      expect(ripple('object').a).to.eql(0)
      expect(ripple('object').b).to.eql(1)
      expect(ripple('object').c).to.eql(2)
      expect(ripple('object').d).to.eql(3)
      done() 
    })
  })

  it('should remove data (object)', function(done){ 
    delete ripple('object').c
    ripple('object').emit('change')
    ripple('object').once('change', function(){ 
      expect(ripple('object').a).to.eql(0)
      expect(ripple('object').b).to.eql(1)
      expect(ripple('object').c).to.eql(undefined)
      done() 
    })
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

    ripple('proxy')
      .once('change', function(data){
        expect(data.sum).to.eql(6)
        expect(data.length).to.eql(4)
        done()
      })
  })

  it('should deal with top-level changes', function(done){ 
    ripple.once('change', function(){
        expect(ripple('object')).to.eql(['heh..'])
        done()
      })
    ripple('object', ['heh..'])
  })


})