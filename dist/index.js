'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

/* istanbul ignore next */
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = sync;

var _values = require('utilise/values');

var _values2 = _interopRequireDefault(_values);

var _header = require('utilise/header');

var _header2 = _interopRequireDefault(_header);

var _client = require('utilise/client');

/* istanbul ignore next */
var _client2 = _interopRequireDefault(_client);

var _noop = require('utilise/noop');

/* istanbul ignore next */
var _noop2 = _interopRequireDefault(_noop);

var _str = require('utilise/str');

var _str2 = _interopRequireDefault(_str);

var _set = require('utilise/set');

var _set2 = _interopRequireDefault(_set);

var _key = require('utilise/key');

var _key2 = _interopRequireDefault(_key);

var _by = require('utilise/by');

var _by2 = _interopRequireDefault(_by);

var _is = require('utilise/is');

var _is2 = _interopRequireDefault(_is);

/* istanbul ignore next */
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// -------------------------------------------
// API: Synchronises resources between server/client
// -------------------------------------------
function sync(ripple, server) {
  log('creating');

/* istanbul ignore next */
  if (!_client2.default && !server) return;
/* istanbul ignore next */
  if (!_client2.default) (0, _values2.default)(ripple.types).map(headers(ripple));
  ripple.stream = stream(ripple);
  ripple.io = io(server);
  ripple.on('change.stream', ripple.stream()); // both   - broadcast change to everyone
  ripple.io.on('change', consume(ripple)); // client - receive change
  ripple.io.on('connection', function (s) {
    return s.on('change', consume(ripple));
  }); // server - receive change
  ripple.io.on('connection', function (s) {
    return ripple.stream(s)();
  }); // server - send all resources to new client
/* istanbul ignore next */
  ripple.io.use(setIP);
  return ripple;
}

// send diff to all or some sockets
var stream = function stream(ripple) {
  return function (sockets) {
    return function (name, change) {
      if (!name) return (0, _values2.default)(ripple.resources).map(function (d) {
        return stream(ripple)(sockets)(d.name);
      });

/* istanbul ignore next */
      var everyone = _client2.default ? [ripple.io] : (0, _values2.default)(ripple.io.of('/').sockets),
          res = ripple.resources[name],
          send = to(ripple, change, res),
          log = count(everyone.length, name);

      return (0, _header2.default)('silent', true)(res) ? delete res.headers.silent : _is2.default.str(sockets) ? (log(everyone.filter((0, _by2.default)('sessionID', sockets)).map(send)), ripple) : !sockets ? (log(everyone.map(send)), ripple) : (log(send(sockets)), ripple);
    };
  };
};

// outgoing transforms
var to = function to(ripple, change, res) {
  return function (socket) {
    var xres = (0, _header2.default)('to')(res),
        xtype = type(ripple)(res).to;

    var body = xres ? xres.call(socket, res, change) : res.body;
    if (!body) return false;

    var rep = xtype ? xtype.call(socket, { name: res.name, body: body, headers: res.headers }, change) : { name: res.name, body: body, headers: res.headers };
    if (!rep) return false;

    return socket.emit('change', change && (!xres || body === true) ? [res.name, change] : [res.name, false, rep]), true;
  };
};

// incoming transforms
var consume = function consume(ripple) {
  return function (_ref) {
/* istanbul ignore next */
    var _ref2 = _slicedToArray(_ref, 3);

    var name = _ref2[0];
    var change = _ref2[1];
    var req = _ref2[2];

    log('receiving', name);

    var socket = this,
        res = ripple.resources[name],
        xtype = type(ripple)(res).from || type(ripple)(req).from,
        xres = (0, _header2.default)('from')(res),
        types = ripple.types,
        next = (0, _set2.default)(change);

    return !res && !types[(0, _header2.default)('content-type')(req)] ? debug('req skip', name) // rejected - invalid
    : xtype && !xtype.call(socket, req, change) ? debug('type skip', name) // rejected - by xtype
    : xres && !xres.call(socket, req, change) ? debug('res skip', name) // rejected - by xres
    : !change ? ripple(silent(req)) // accept - replace (new)
    : !change.key ? ripple(silent({ name: name, body: change.value })) // accept - replace at root
    : (silent(res), next(res.body)); // accept - deep change
  };
};

var count = function count(total, name) {
  return function (tally) {
    return log((0, _str2.default)((_is2.default.arr(tally) ? tally : [1]).filter(Boolean).length).green.bold + '/' + (0, _str2.default)(total).green, 'sending', name);
  };
};

var headers = function headers(ripple) {
  return function (type) {
/* istanbul ignore next */
    var parse = type.parse || _noop2.default;
    type.parse = function (res) {
      var existing = ripple.resources[res.name],
          from = (0, _header2.default)('from')(res) || (0, _header2.default)('from')(existing),
          to = (0, _header2.default)('to')(res) || (0, _header2.default)('to')(existing);
      if (from) res.headers.from = from;
      if (to) res.headers.to = to;
      return parse.apply(this, arguments), res;
    };
  };
};

var io = function io(opts) {
/* istanbul ignore next */
  var r = !_client2.default ? require('socket.io')(opts.server || opts) : window.io ? window.io() : _is2.default.fn(require('socket.io-client')) ? require('socket.io-client')() : { on: _noop2.default, emit: _noop2.default };
/* istanbul ignore next */
  r.use = r.use || _noop2.default;
  return r;
};

/* istanbul ignore next */
var setIP = function setIP(socket, next) {
  socket.ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  next();
};

var type = function type(ripple) {
  return function (res) {
    return ripple.types[(0, _header2.default)('content-type')(res)] || {};
  };
},
    silent = function silent(res) {
  return (0, _key2.default)('headers.silent', true)(res);
},
    log = require('utilise/log')('[ri/sync]'),
    err = require('utilise/err')('[ri/sync]'),
    debug = log;