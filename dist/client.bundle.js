var sync = (function () {
'use strict';

var client = typeof window != 'undefined';

var is_1 = is;
is.fn      = isFunction;
is.str     = isString;
is.num     = isNumber;
is.obj     = isObject;
is.lit     = isLiteral;
is.bol     = isBoolean;
is.truthy  = isTruthy;
is.falsy   = isFalsy;
is.arr     = isArray;
is.null    = isNull;
is.def     = isDef;
is.in      = isIn;
is.promise = isPromise;

function is(v){
  return function(d){
    return d == v
  }
}

function isFunction(d) {
  return typeof d == 'function'
}

function isBoolean(d) {
  return typeof d == 'boolean'
}

function isString(d) {
  return typeof d == 'string'
}

function isNumber(d) {
  return typeof d == 'number'
}

function isObject(d) {
  return typeof d == 'object'
}

function isLiteral(d) {
  return typeof d == 'object' 
      && !(d instanceof Array)
}

function isTruthy(d) {
  return !!d == true
}

function isFalsy(d) {
  return !!d == false
}

function isArray(d) {
  return d instanceof Array
}

function isNull(d) {
  return d === null
}

function isDef(d) {
  return typeof d !== 'undefined'
}

function isPromise(d) {
  return d instanceof Promise
}

function isIn(set) {
  return function(d){
    return !set ? false  
         : set.indexOf ? ~set.indexOf(d)
         : d in set
  }
}

var to = { 
  arr: toArray
, obj: toObject
};

function toArray(d){
  return Array.prototype.slice.call(d, 0)
}

function toObject(d) {
  var by = 'id'
    , o = {};

  return arguments.length == 1 
    ? (by = d, reduce)
    : reduce.apply(this, arguments)

  function reduce(p,v,i){
    if (i === 0) p = {};
    p[is_1.fn(by) ? by(v, i) : v[by]] = v;
    return p
  }
}

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var owner = client ? /* istanbul ignore next */ window : commonjsGlobal;

var log$1 = function log(ns){
  return function(d){
    if (!owner.console || !console.log.apply) return d;
    is_1.arr(arguments[2]) && (arguments[2] = arguments[2].length);
    var args = to.arr(arguments)
      , prefix = '[log][' + (new Date()).toISOString() + ']' + ns;

    args.unshift(prefix.grey ? prefix.grey : prefix);
    return console.log.apply(console, args), d
  }
};

var err$1 = function err(ns){
  return function(d){
    if (!owner.console || !console.error.apply) return d;
    is_1.arr(arguments[2]) && (arguments[2] = arguments[2].length);
    var args = to.arr(arguments)
      , prefix = '[err][' + (new Date()).toISOString() + ']' + ns;

    args.unshift(prefix.red ? prefix.red : prefix);
    return console.error.apply(console, args), d
  }
};

var client_1 = function(ripple, ref) {
    void 0 === ref && (ref = {});
    ref.server;
    var port = ref.port;
    void 0 === port && (port = 3e3);
    ripple.render = render(ripple)(ripple.render), ripple.subscribe = subscribe(ripple), 
    ripple.io = new WebSocket(location.origin.replace("http", "ws")), ripple.io.onopen = function(event) {
        console.log("onopen", event);
    }, ripple.io.onclose = function(event) {
        console.log("onclose", event);
    }, ripple.io.onerror = function(event) {
        console.log("onerror", event);
    }, ripple.io.onmessage = function(data) {
        console.log("recv", data);
    };
};

var recv = function(ripple) {
    return function(message) {
        console.log("recv", message);
    };
};
var render = function(ripple) {
    return function(next) {
        return function(el) {};
    };
};
var subscribe = function(ripple) {
    return function(name, keys) {
        return is_1.def(keys) ? is_1.arr(keys) ? void 0 : ripple.subscribe(name, [ keys ]) : ripple.subscribe(name, [ "" ]);
    };
};
var send = function(ripple) {
    return function(req) {};
};
var log = log$1("[ri/sync]");
var err = err$1("[ri/sync]");

return client_1;

}());
