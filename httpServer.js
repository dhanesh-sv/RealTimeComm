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

var usersList = [];
var createdRooms = [];

io.on("connect", clientConnected);
function clientConnected(client) {
    console.log("Client Connected");

    //client joining methods
    client.on("addUser", addUser);
    function addUser(userData) {

        //checking if user exists or not
        var userAvailabilityCheck = usersList.filter(function (i) {
            //console.log(i.value.userId);
            //console.log(userData.userId);
            return i.value.userId == userData.userId;

        });
        //console.log(userAvailabilityCheck);
        //console.log(userAvailabilityCheck.length);

        //removing existing user details
        if (userAvailabilityCheck.length > 0) {
            usersList = usersList.filter(function (i) {

                return i.value.userId !== userData.userId;
            });
        };

        console.log(usersList);
        userData.socketId = client.id;
        // usersList[client.id] = userData;
        usersList.push({
            key: client.id,
            value: userData
        });
        // usersList.push(userData);



        console.log(userData.userName);
        console.log(userData.userId);
        console.log(userData.socketId);
        console.log(usersList);
        io.sockets.emit("receiveUsersList", usersList);

    };
    //client joining methods


    //***start****//message section//***start****//
    client.on("clientMessage", clientMessage);
    function clientMessage(data) {
        console.log(data);
        io.sockets.emit("serverMessage", data);
    };
    //***end****//message section//***end****//


    //client disconnect methods
    client.on("disconnect", clientDisconnected);
    function clientDisconnected(data) {
        usersList = usersList.filter(function (i) {
            return i.key !== client.id;
        });
        console.log("client disconnected")
        console.log(usersList);
        io.sockets.emit("receiveUsersList", usersList);
    };

    //***start****//initiate call//***start****//
    //response codes
    //1-same user
    //2-accepted
    //3-rejected
    client.on("initiateCallAction", initiateCallAction)
    function initiateCallAction(toClientId) {
        var responseCode, responseData;
        console.log("toClientId-" + toClientId);
        if (client.id == toClientId) {
            responseCode = 1;
            client.emit('responseFromReceiver', responseCode, responseData);
        };


      //var res=  usersList.map(n => {
      //      if (client.id === n.key) {
      //          console.log(n.value.userName);
      //          return n.value.userName;
      //      }
      //  });



        var getCurrentClientObj = usersList.filter(function (i) {
            return i.key == client.id;
        });


        console.log(getCurrentClientObj[0].key);
        console.log(getCurrentClientObj[0].value.userId);
        client.broadcast.to(toClientId).emit('requestingReceiverForCall', client.id, getCurrentClientObj[0].value.userName)
       // console.log(client.id);
        //var ids=client.id;
        //console.log(usersList[ids]);
        // client.broadcast.to(toClientId).emit('requestingReceiverForCall', client.id,);
        // io.sockets.emit("responseFromReceiver", responseCode, responseData);
    };
    //***end****//initiate call//***end****//

};
