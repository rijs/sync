(async () => {
  const puppeteer = require('puppeteer')
      , browser = await puppeteer.launch({ headless: process.env.HEADLESS !== 'false' })
      , { emitterify, file, update, keys, delay, str } = require('utilise/pure')
      , { test } = require('tap')
      , { Writable } = require('stream')
      
  await test('.subscribe', async ({ plan, same }) => {
    plan(4)
    const { ripple, page } = await startup()
    ripple('foo', 'bar')
    same('bar', await page.evaluate(d => ($ = ripple.subscribe('foo'))))
    same(1, keys(ripple.server.ws.sockets[0].subscriptions).length)
    await page.evaluate(d => Promise.all($.source.emit('stop')))
    same(str({ undefined: undefined }), await page.evaluate(d => JSON.stringify(ripple.subscriptions.foo)))
    same(0, keys(ripple.server.ws.sockets[0].subscriptions).length)
    page.close()
  })

  await test('.subscribe before resource exists', async ({ plan, same }) => {
    plan(4)
    const { ripple, page } = await startup()
    ripple('foo', 'bar')
    same('bar', await page.evaluate(d => ($ = ripple.subscribe('foo'))))
    same(1, keys(ripple.server.ws.sockets[0].subscriptions).length)
    await page.evaluate(d => Promise.all($.source.emit('stop')))
    same(str({ undefined: undefined }), await page.evaluate(d => JSON.stringify(ripple.subscriptions.foo)))
    same(0, keys(ripple.server.ws.sockets[0].subscriptions).length)
    page.close()
  })

  await test('.subscribe on single key', async ({ plan, same }) => {
    plan(3)
    const { ripple, page } = await startup()    
    ripple('foo', { bar: 'boo' })
    await page.evaluate(d => { results = ripple.subscribe('foo', 'bar')
      .reduce((acc = [], d) => acc.concat(d))
      .filter(d => d.length == 2)
    })
    
    update('xxx', 'xxx')(ripple('foo'))
    update('bar', 'baz')(ripple('foo'))
    same(['boo', 'baz'], await page.evaluate(d => results))

    await page.evaluate(d => Promise.all(results.source.emit('stop')))
    same(str({ bar: undefined }), await page.evaluate(d => JSON.stringify(ripple.subscriptions.foo)))
    same(0, keys(ripple.server.ws.sockets[0].subscriptions).length)

    page.close()
  })

  await test('.subscribe on multiple keys', async ({ plan, same }) => {
    plan(4)
    const { ripple, page } = await startup()
    
    ripple('foo', { bar: 'bar', baz: { baz: 'baz' }})
    await page.evaluate(d => {
      clone = d => JSON.parse(JSON.stringify(d))
      $ = ripple
        .subscribe('foo', ['bar', 'baz'])
        .reduce((acc = [], d) => acc.concat(clone(d)))
        
      results = $.filter(d => d.length == 4)
      return $.filter(d => d.length == 2)
    })

    update('xxx', 'xxx')(ripple('foo'))
    update('bar', 'boo')(ripple('foo'))
    update('baz.bil', 'bil')(ripple('foo'))

    same([
      { bar: 'bar' }
    , { bar: 'bar', baz: { baz: 'baz' }}
    , { bar: 'boo', baz: { baz: 'baz' }}
    , { bar: 'boo', baz: { baz: 'baz', bil: 'bil' }}
    ], await page.evaluate(d => results))

    same(2, keys(ripple.server.ws.sockets[0].subscriptions).length)
    await page.evaluate(d => Promise.all(results.source.emit('stop')))
    same(str({ bar: undefined, baz: undefined }), await page.evaluate(d => JSON.stringify(ripple.subscriptions.foo)))
    same(0, keys(ripple.server.ws.sockets[0].subscriptions).length)

    page.close()
  })

  await test('.get', async ({ plan, same }) => {
    plan(4)
    const { ripple, page } = await startup()
    
    ripple('foo', { bar: 'bar' })
    same('bar', await page.evaluate(d => ripple.get('foo', 'bar')), 'fetch single value')

    update('bar', 'boo')(ripple('foo'))
    same('bar', await page.evaluate(d => ripple.get('foo', 'bar')), 'fetch cached value')

    same(0, keys(ripple.server.ws.sockets[0].subscriptions).length, 'no subscriptions (server)')
    same(str({ bar: undefined }), await page.evaluate(d => JSON.stringify(ripple.subscriptions.foo)), 'no subscriptions (client)')

    page.close()
  })

  await test('.get on multiple keys', async ({ plan, same }) => {
    plan(3)
    const { ripple, page } = await startup()
    
    ripple('foo', { bar: 'bar', baz: 'baz' })
    same(['bar', 'baz'], await page.evaluate(d => ripple.get('foo', ['bar', 'baz'])), 'fetch single value')

    same(0, keys(ripple.server.ws.sockets[0].subscriptions).length, 'no subscriptions (server)')
    same(str({ bar: undefined, baz: undefined }), await page.evaluate(d => JSON.stringify(ripple.subscriptions.foo)), 'no subscriptions (client)')

    page.close()
  })

  await test('.upload', async ({ plan, same, notOk }) => {
    plan(5)
    const { ripple, page } = await startup()
        , sink = () => {
            const out = { result: '' }
            out.stream = new Writable({ 
              write(data, enc, next){ 
                out.result += data
                next()
              }
            })
            return out
          }
        , pipe = input => new Promise(resolve => {
            const out = sink()
            input.pipe(out.stream.on('finish', d => resolve(out.result)))
          })
        , from = req => {
            same(req.data.value.fname, 'fname')
            return Promise.all([
              ...req.data.value.files1
            , ...req.data.value.files2
            ].map(pipe))
              .then(results => {
                same(7000, results.join('').length, 'piped results')
                return 'ack'
              })
          }
        , results = [
            { type: 'progress'
            , value: {
                total: 7000
              , received: 1000
              }
            }
          , { type: 'progress'
            , value: {
                total: 7000
              , received: 2024
              }
            }
          , { type: 'progress'
            , value: {
                total: 7000
              , received: 3000
              }
            }
          , { type: 'progress'
            , value: {
                total: 7000
              , received: 4024
              }
            }
          , { type: 'progress'
            , value: {
                total: 7000
              , received: 5048
              }
            }
          , { type: 'progress'
            , value: {
                total: 7000
              , received: 6072
              }
            }
          , { type: 'progress'
            , value: {
                total: 7000
              , received: 7000
              }
            }
          , { type: 'complete'
            , value: 'ack'
            }
          ]

    ripple('foo', {}, { from })
    same(results, await page.evaluate(d => {
      const results = []
          , createFileList = arr => (arr.__proto__ = FileList.prototype, arr)
          , form = {
              fname: 'fname'
            , files1: createFileList([
                new File([Array(1000).fill(1).join('')], '', { name: 'file1' })
              ])
            , files2: createFileList([
                new File([Array(2000).fill(2).join('')], '', { name: 'file2' })
              , new File([Array(4000).fill(3).join('')], '', { name: 'file3' })
              ])
            }

      return ripple
        .upload('foo', form)
        .on('progress', d => results.push({ type: 'progress', value: d }))
        .map(d => (results.push({ type: 'complete', value: d }), results))
    }), 'upload form')

    notOk(await page.evaluate(d => ripple.subscriptions.foo), 'no subscriptions (client)')
    same(0, keys(ripple.server.ws.sockets[0].subscriptions).length, 'no subscriptions (server)')
    page.close()
  })

  await test('.render (+ hot reload)', async ({ plan, same }) => {
    plan(2)
    const { ripple, page } = await startup()
        , received = emitterify()

    // capture messages
    ripple('test', {}, { from: d => received.emit('drawn', d.data) })

    // first version of component
    ripple('x-foo', node => ripple.send('test', 'DRAW', node.innerHTML = 1))

    await page.evaluate(d => {
      foo = document.createElement('x-foo')
      document.body.appendChild(foo)
      return ripple.draw(foo)
    })
    
    // first component rendered
    same({ name: 'test', type: 'DRAW', value: '1' }, await received.once('drawn'), 'initial load')

    // register new version
    ripple('x-foo', node => ripple.send('test', 'DRAW', node.innerHTML = 2))

    // second component rendereds
    same({ name: 'test', type: 'DRAW', value: '2' }, await received.once('drawn'), 'hot reload')

    page.close()
  })

  process.exit(0)

  async function startup(){
    const core = require('rijs.core')
        , data = require('rijs.data')
        , fn   = require('rijs.fn')
        , ripple = require('./')(fn(data(core())), { port: 0 })

    ripple.server.express.use((req, res) => res.send(`
      <script>${file(require.resolve('utilise.emitterify/client'))}</script>
      <script>${file(require.resolve('rijs.core/client.bundle'))}</script>
      <script>${file(require.resolve('rijs.data/client.bundle'))}</script>
      <script>${file(require.resolve('rijs.fn/client.bundle'))}</script>
      <script>${file(require.resolve('rijs.components/client.bundle'))}</script>
      <script>${file('./client.bundle.js')}</script>
      <script>ripple = sync(components(fn(data(core()))))</script>
    `))
    await ripple.server.once('listening')
    const page = await browser.newPage()
    await page.goto(`http://localhost:${ripple.server.port}`)
    if (process.env.DEBUG == 'true')
      page.on('console', (...args) => console.log('(CLIENT):', ...args));
    return { ripple, page }
  }
})()