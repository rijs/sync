'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

/* istanbul ignore next */
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = sync;

var _identity = require('utilise/identity');

var _identity2 = _interopRequireDefault(_identity);

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

var _keys = require('utilise/keys');

var _keys2 = _interopRequireDefault(_keys);

var _not = require('utilise/not');

var _not2 = _interopRequireDefault(_not);

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
// Synchronises resources between server/client
// -------------------------------------------
function sync(ripple, server) {
  log('creating');

/* istanbul ignore next */
  if (!_client2.default && !server) return;
/* istanbul ignore next */
  if (!_client2.default) ripple.to = clean(ripple.to), (0, _values2.default)(ripple.types).map(function (type) {
    return type.parse = headers(ripple)(type.parse);
  });

  ripple.stream = stream(ripple);
  ripple.respond = respond(ripple);
  ripple.io = io(server);
  ripple.on('change.stream', ripple.stream()); // both   - broadcast change to everyone
  ripple.io.on('change', consume(ripple)); // client - receive change
  ripple.io.on('response', response(ripple)); // client - receive response
  ripple.io.on('connection', function (s) {
    return s.on('change', consume(ripple));
  }); // server - receive change
  ripple.io.on('connection', function (s) {
    return ripple.stream(s)();
  }); // server - send all resources to new client
  ripple.io.use(setIP);
  return ripple;
}

var respond = function respond(ripple) {
  return function (socket, name, time) {
    return function (reply) {
      socket.emit('response', [name, time, reply]);
    };
  };
};

var response = function response(ripple) {
  return function (_ref) {
/* istanbul ignore next */
    var _ref2 = _slicedToArray(_ref, 3);

    var name = _ref2[0];
    var time = _ref2[1];
    var reply = _ref2[2];

    ripple.resources[name].body.emit('response._' + time, reply);
  };
};

// send diff to all or some sockets
var stream = function stream(ripple) {
  return function (sockets) {
    return function (name, change) {
      if (!name) return (0, _values2.default)(ripple.resources).map(function (d) {
        return stream(ripple)(sockets)(d.name);
      });

/* istanbul ignore next */
      var everyone = _client2.default ? [ripple.io] : (0, _values2.default)(ripple.io.of('/').sockets),
          log = count(everyone.length, name),
          res = ripple.resources[name],
          send = to(ripple, res, change);

      return !res ? log('no resource', name) : _is2.default.str(sockets) ? (log(everyone.filter((0, _by2.default)('sessionID', sockets)).map(send)), ripple) : !sockets ? (log(everyone.map(send)), ripple) : (log(send(sockets)), ripple);
    };
  };
};

// outgoing transforms
var to = function to(ripple, res, change) {
  return function (socket) {
    if ((0, _header2.default)('silent', socket)(res)) return delete res.headers.silent, false;

    var xres = (0, _header2.default)('to')(res),
        xtype = type(ripple)(res).to,
        xall = ripple.to,
        body,
        rep,
        out;

    body = res.body;
    if (xres) {
      if (!(out = xres.call(socket, res, change))) return false;
      if (out !== true) {
        change = false, body = out;
      }
    }

    rep = { name: res.name, body: body, headers: res.headers };
    if (xtype) {
      if (!(out = xtype.call(socket, rep, change))) return false;
      if (out !== true) change = false, rep = out;
    }

    if (xall) {
      if (!(out = xall.call(socket, rep, change))) return false;
      if (out !== true) change = false, rep = out;
    }

    return socket.emit('change', change ? [res.name, change] : [res.name, false, rep]), true;
  };
};

// incoming transforms
var consume = function consume(ripple) {
  return function (_ref3, ack) {
/* istanbul ignore next */
    var _ref4 = _slicedToArray(_ref3, 3);

    var name = _ref4[0];
    var change = _ref4[1];
    var _ref4$ = _ref4[2];
    var req = _ref4$ === undefined ? {} : _ref4$;

    log('receiving', name);

    var res = ripple.resources[name],
        xall = ripple.from,
        xtype = type(ripple)(res).from || type(ripple)(req).from // is latter needed?
    ,
        xres = (0, _header2.default)('from')(res),
        next = (0, _set2.default)(change),
        silent = silence(this),
        respond = ack || ripple.respond(this, name, change.time);

    return xall && !xall.call(this, req, change, respond) ? debug('skip all', name) // rejected - by xall
    : xtype && !xtype.call(this, req, change, respond) ? debug('skip type', name) // rejected - by xtype
    : xres && !xres.call(this, req, change, respond) ? debug('skip res', name) // rejected - by xres
    : !change ? ripple(silent(req)) // accept - replace (new)
    : !change.key ? ripple(silent({ name: name, body: change.value })) // accept - replace at root
    : (silent(res), next(res.body)); // accept - deep change
  };
};

var count = function count(total, name) {
  return function (tally) {
    return debug((0, _str2.default)((_is2.default.arr(tally) ? tally : [1]).filter(Boolean).length).green.bold + '/' + (0, _str2.default)(total).green, 'sending', name);
  };
};

var headers = function headers(ripple) {
  return function (next) {
    return function (res) {
      var existing = ripple.resources[res.name],
          from = (0, _header2.default)('from')(res) || (0, _header2.default)('from')(existing),
          to = (0, _header2.default)('to')(res) || (0, _header2.default)('to')(existing);
      if (from) res.headers.from = from;
      if (to) res.headers.to = to;
      return next ? next(res) : res;
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

var setIP = function setIP(socket, next) {
  socket.ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  next();
};

var clean = function clean(next) {
  return function (_ref5, change) {
    var name = _ref5.name;
    var body = _ref5.body;
    var headers = _ref5.headers;

    if (change) return next ? next.apply(this, arguments) : true;

    var stripped = {};

    (0, _keys2.default)(headers).filter((0, _not2.default)((0, _is2.default)('silent'))).map(function (header) {
      return stripped[header] = headers[header];
    });

    return (next || _identity2.default).apply(this, [{ name: name, body: body, headers: stripped }, change]);
  };
};

var type = function type(ripple) {
  return function (res) {
    return ripple.types[(0, _header2.default)('content-type')(res)] || {};
  };
},
    silence = function silence(socket) {
  return function (res) {
    return (0, _key2.default)('headers.silent', socket)(res);
  };
},
    log = require('utilise/log')('[ri/sync]'),
    err = require('utilise/err')('[ri/sync]'),
/* istanbul ignore next */
    debug = _noop2.default;