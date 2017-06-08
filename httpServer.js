var express = require("express");
var http = require("http");
var socketio = require("socket.io");

var app = express();

var server = http.createServer(engine);

function engine() {
    console.log("request received");
};

var io = socketio(server);
server.listen(7049, socketServerStartUp);

function socketServerStartUp() {
    console.log("socket server started");
};

app.listen(6049, appServerStartUp);
function appServerStartUp() {
    console.log("app server started");
};
app.use(express.static(__dirname));

app.get("/", render1);

function render1(request, response) {
    response.sendFile(__dirname + "/index.html");
};


io.on("connect", clientConnected);
function clientConnected(client) {
    console.log("Client Connected");

    client.on("clientMessage", clientMessage);
    function clientMessage(data) {
        console.log(data);
        io.sockets.emit("serverMessage", data);
    };

    client.on("disconnect", clientDisconnected);
    function clientDisconnected(data) {
        console.log("client disconnected")
    };
};