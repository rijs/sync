'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sync;

var _identity = require('utilise/identity');

var _identity2 = _interopRequireDefault(_identity);

var _replace = require('utilise/replace');

var _replace2 = _interopRequireDefault(_replace);

var _prepend = require('utilise/prepend');

var _prepend2 = _interopRequireDefault(_prepend);

var _flatten = require('utilise/flatten');

var _flatten2 = _interopRequireDefault(_flatten);

var _values = require('utilise/values');

var _values2 = _interopRequireDefault(_values);

var _header = require('utilise/header');

var _header2 = _interopRequireDefault(_header);

var _client = require('utilise/client');

var _client2 = _interopRequireDefault(_client);

var _noop = require('utilise/noop');

var _noop2 = _interopRequireDefault(_noop);

var _keys = require('utilise/keys');

var _keys2 = _interopRequireDefault(_keys);

var _key = require('utilise/key');

var _key2 = _interopRequireDefault(_key);

var _str = require('utilise/str');

var _str2 = _interopRequireDefault(_str);

var _not = require('utilise/not');

var _not2 = _interopRequireDefault(_not);

var _by = require('utilise/by');

var _by2 = _interopRequireDefault(_by);

var _is = require('utilise/is');

var _is2 = _interopRequireDefault(_is);

var _jsondiffpatch = require('jsondiffpatch');

/* istanbul ignore next */
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// -------------------------------------------
// API: Synchronises resources between server/client
// -------------------------------------------
function sync(ripple, server) {
  log('creating');

  if (!_client2.default && !server) return;
  (0, _values2.default)(ripple.types).map(headers(ripple));
  ripple.sync = emit(ripple);
  ripple.io = io(server);
  ripple.on('change', function (res) {
    return emit(ripple)()(res.name);
  });
  ripple.io.on('change', silent(ripple));
  ripple.io.on('connection', function (s) {
    return s.on('change', change(ripple));
  });
  ripple.io.on('connection', function (s) {
    return emit(ripple)(s)();
  });
  ripple.io.use(setIP);
  return ripple;
}

function change(ripple) {
  return function (req) {
    log('receiving', req.name);

    var socket = this,
        res = ripple.resources[req.name],
        check = type(ripple)(req).from || _identity2.default;

    if (!res) return log('no resource', req.name);
    if (!check.call(this, req)) return debug('type skip', req.name);
    if (!_is2.default.obj(res.body)) return silent(ripple)(req);

    var to = (0, _header2.default)('proxy-to')(res) || _identity2.default,
        from = (0, _header2.default)('proxy-from')(res),
        body = to.call(socket, (0, _key2.default)('body')(res)),
        deltas = (0, _jsondiffpatch.diff)(body, req.body);

    if (_is2.default.arr(deltas)) return delta('') && res.body.emit('change');

    (0, _keys2.default)(deltas).reverse().filter((0, _not2.default)((0, _is2.default)('_t'))).map(paths(deltas)).reduce(_flatten2.default, []).map(delta).some(Boolean) && res.body.emit('change');

    function delta(k) {
      var d = (0, _key2.default)(k)(deltas),
          name = req.name
      // , body  = res.body
      ,
          index = k.replace(/(^|\.)_/g, '$1'),
          type = d.length == 1 ? 'push' : d.length == 2 ? 'update' : d[2] === 0 ? 'remove' : '',
          value = type == 'update' ? d[1] : d[0],
          next = types[type];

      if (!type) return false;
      if (!from || from.call(socket, value, body, index, type, name, next)) {
        !index ? silent(ripple)(req) : next(index, value, body, name, res);
        return true;
      }
    }
  };
}

function paths(base) {
  return function (k) {
    var d = (0, _key2.default)(k)(base);
    k = _is2.default.arr(k) ? k : [k];

    return _is2.default.arr(d) ? k.join('.') : (0, _keys2.default)(d).map((0, _prepend2.default)(k.join('.') + '.')).map(paths(base));
  };
}

function push(k, value, body, name) {
  var path = k.split('.'),
      tail = path.pop(),
      o = (0, _key2.default)(path.join('.'))(body) || body;

  _is2.default.arr(o) ? o.splice(tail, 0, value) : (0, _key2.default)(k, value)(body);
}

function remove(k, value, body, name) {
  var path = k.split('.'),
      tail = path.pop(),
      o = (0, _key2.default)(path.join('.'))(body) || body;

  _is2.default.arr(o) ? o.splice(tail, 1) : delete o[tail];
}

function update(k, value, body, name) {
  (0, _key2.default)(k, value)(body);
}

function headers(ripple) {
  return function (type) {
    var parse = type.parse || _noop2.default;
    type.parse = function (res) {
      if (_client2.default) return parse.apply(this, arguments), res;
      var existing = ripple.resources[res.name],
          from = (0, _header2.default)('proxy-from')(existing),
          to = (0, _header2.default)('proxy-to')(existing);

      res.headers['proxy-from'] = (0, _header2.default)('proxy-from')(res) || (0, _header2.default)('from')(res) || from;
      res.headers['proxy-to'] = (0, _header2.default)('proxy-to')(res) || (0, _header2.default)('to')(res) || to;
      return parse.apply(this, arguments), res;
    };
  };
}

function silent(ripple) {
  return function (res) {
    return res.headers.silent = true, ripple(res);
  };
}

function io(opts) {
  var r = !_client2.default ? require('socket.io')(opts.server || opts) : window.io ? window.io() : _is2.default.fn(require('socket.io-client')) ? require('socket.io-client')() : { on: _noop2.default, emit: _noop2.default };
  r.use = r.use || _noop2.default;
  return r;
}

// emit all or some resources, to all or some clients
function emit(ripple) {
  return function (socket) {
    return function (name) {
      if (arguments.length && !name) return;
      if (!name) return (0, _values2.default)(ripple.resources).map((0, _key2.default)('name')).map(emit(ripple)(socket)), ripple;

      var res = ripple.resources[name],
          sockets = _client2.default ? [ripple.io] : ripple.io.of('/').sockets,
          lgt = stats(sockets.length, name),
          silent = (0, _header2.default)('silent', true)(res);

      return silent ? delete res.headers.silent : !res ? log('no resource to emit: ', name) : _is2.default.str(socket) ? lgt(sockets.filter((0, _by2.default)('sessionID', socket)).map(to(ripple)(res))) : !socket ? lgt(sockets.map(to(ripple)(res))) : lgt([to(ripple)(res)(socket)]);
    };
  };
}

function to(ripple) {
  return function (res) {
    return function (socket) {
      var body = _is2.default.fn(res.body) ? '' + res.body : res.body,
          rep,
          fn = {
        type: type(ripple)(res).to || _identity2.default,
        res: res.headers['proxy-to'] || _identity2.default
      };

      body = fn.res.call(socket, body);
      if (!body) return false;

      rep = fn.type.call(socket, { name: res.name, body: body, headers: res.headers });
      if (!rep) return false;

      socket.emit('change', rep);
      return true;
    };
  };
}

function stats(total, name) {
  return function (results) {
    log((0, _str2.default)(results.filter(Boolean).length).green.bold + '/' + (0, _str2.default)(total).green, 'sending', name);
  };
}

function setIP(socket, next) {
  socket.ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  next();
}

function type(ripple) {
  return function (res) {
    return ripple.types[(0, _header2.default)('content-type')(res)];
  };
}

var log = require('utilise/log')('[ri/sync]'),
    err = require('utilise/err')('[ri/sync]'),
    debug = _noop2.default,
    types = { push: push, remove: remove, update: update };