module.exports = function(ripple, ref) {
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
}, render = function(ripple) {
    return function(next) {
        return function(el) {};
    };
}, subscribe = function(ripple) {
    return function(name, keys) {
        return is.def(keys) ? is.arr(keys) ? void 0 : ripple.subscribe(name, [ keys ]) : ripple.subscribe(name, [ "" ]);
    };
}, send = function(ripple) {
    return function(req) {};
}, client = require("utilise/client"), is = require("utilise/is"), log = require("utilise/log")("[ri/sync]"), err = require("utilise/err")("[ri/sync]");
