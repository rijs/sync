module.exports = function(ripple, ref) {
    void 0 === ref && (ref = {});
    ref.server;
    var port = ref.port;
    void 0 === port && (port = 3e3);
    var app = require("express")(), server$1 = ripple.server = require("http").createServer(app), ws = ripple.io = new (require("uws").Server)({
        server: server$1
    });
    ripple.server.express = app, ws.on("connection", function(socket) {
        console.log("connection", socket), socket.send("Welcome to the 10s!");
    }), ws.on("message", recv(ripple)), server$1.listen(port, function(d) {
        return log("listening", server$1.address().port);
    });
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
