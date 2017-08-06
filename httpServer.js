var express = require("express");
var http = require("http");
var https = require('https');
var socketio = require("socket.io");
var fs = require('fs');

var privateKey = fs.readFileSync('hostkey.pem');
var certificate = fs.readFileSync('hostcert.pem');
var credentials = { key: privateKey, cert: certificate };

var app = express();

var server = http.createServer(engine);

var httpsServer = https.createServer(credentials, app);
app.listen(8443);

function engine() {
    console.log("request received");
};

//var io = socketio(server);
//server.listen(7049, socketServerStartUp);

var io = socketio(httpsServer);
httpsServer.listen(7049, socketServerStartUp);

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
var chatRooms = [];

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


    //getPartnerId
    function getPartnerId() {
        var getroomId;
        var otherClient;

        usersList.map(n=> {
            if (client.id == n.key) {
                getroomId = n.value.roomId;
            }
        });

        usersList.map(n=> {
            if (getroomId == n.value.roomId && client.id != n.key) {
                otherClient = n.key;
            }
        });
        return otherClient;
    }


    //client disconnect methods
    client.on("disconnect", clientDisconnected);
    function clientDisconnected(data) {
        usersList = usersList.filter(function (i) {
            return i.key !== client.id;
        });
        console.log("client disconnected")
        console.log(usersList);
        if (client.roomId != '') {
            onCallEnded();
        }
        else { io.sockets.emit("receiveUsersList", usersList); }
        
    };

    //call end method
    client.on("endCall", onCallEnded);
    function onCallEnded() {
        var getroomId;
        var otherClient;
        usersList.map(n=> {
            if (client.id == n.key) {
                getroomId = n.value.roomId;
            }
        });

        usersList.map(n=> {
            if (getroomId == n.value.roomId && client.id != n.key) {
                otherClient = n.key;
            }
        });

        usersList.map(n=> {
            if (getroomId === n.value.roomId) {
                n.value.roomId = '';
                n.value.isbusy = 0;
                n.value.inCall = 0;
            }
        });

        chatRooms = chatRooms.filter(function (i) {
            return i.key !== getroomId;
        });
        console.log(chatRooms);
        console.log(otherClient);
        client.broadcast.to(otherClient).emit('endCallResponse');
        io.sockets.emit("receiveUsersList", usersList);
    };
    //client disconnect methods


    //***start****//initiate call//***start****//
    //response codes
    //1-same user
    //2-accepted
    //3-rejected
    client.on("initiateCallAction", initiateCallAction)
    function initiateCallAction(toClientId, patientDetails) {
        var responseCode, responseData;
        console.log("toClientId-" + toClientId);
        if (client.id == toClientId) {
            responseCode = 1;
            client.emit('responseFromReceiver', responseCode, responseData);
            return;
        };

        var getCurrentClientObj = usersList.filter(function (i) {
            return i.key == client.id;
        });


        // console.log(getCurrentClientObj[0].key);
        // console.log(getCurrentClientObj[0].value.userId);
        var roomId = "caller-" + client.id + "Receiver-" + toClientId;

        client.join(roomId);
        usersList.map(n=> {
            if (client.id === n.key) {
                n.value.roomId = roomId;
                n.value.isbusy = 1;
            }
        });

        console.log(usersList);

        client.broadcast.to(toClientId).emit('requestingReceiverForCall', client.id, getCurrentClientObj[0].value.userName, toClientId, roomId, patientDetails);
        io.sockets.emit("receiveUsersList", usersList);

        // client.broadcast.to(toClientId).emit('requestingReceiverForCall', client.id,);
        // io.sockets.emit("responseFromReceiver", responseCode, responseData);
    };

    client.on("callRequestResponse", callRequestResponse);
    function callRequestResponse(receiverConfirmation, callerId, ReceiverId, roomId) {
        var responseCode, responseData;
        if (receiverConfirmation == false) {
            responseCode = 3;
            usersList.map(n=> {
                if (callerId === n.key) {
                    n.value.roomId = '';
                    n.value.isbusy = 0;
                }
            });
            client.broadcast.to(callerId).emit('responseFromReceiver', responseCode, responseData);
            io.sockets.emit("receiveUsersList", usersList);
            // client.emit('responseFromReceiver', responseCode, responseData);
        } else {
            responseCode = 2;
            client.join(roomId);

            chatRooms.push({
                key: roomId,
                value: { callerId: callerId, ReceiverId: ReceiverId, MRN_No: '' }
            });

            usersList.map(n=> {
                if (client.id === n.key) {
                    n.value.roomId = roomId;
                    n.value.isbusy = 1;
                }
            });

            usersList.map(n=> {
                if (roomId === n.value.roomId) {
                    n.value.inCall = 1;
                }
            });

            console.log(usersList);
            client.broadcast.to(callerId).emit('responseFromReceiver', responseCode, responseData);
            io.sockets.emit("receiveUsersList", usersList);
        }

    }




    //getcontrol Request
    client.on("getControlRequest", sendGetControlrequest);
    function sendGetControlrequest() {
        var getroomId;
        var otherClient;

        usersList.map(n=> {
            if (client.id == n.key) {
                getroomId = n.value.roomId;
            }
        });

        usersList.map(n=> {
            if (getroomId == n.value.roomId && client.id != n.key) {
                otherClient = n.key;
            }
        });
        console.log(otherClient);
        client.broadcast.to(otherClient).emit('receiveGetControlRequest');
    };

    //response for getcontrol
    client.on("getControlResponse", getControlResponse);
    function getControlResponse(getControlResponseFromClient) {
        var PartnerId = getPartnerId();
        client.broadcast.to(PartnerId).emit('receiveGetControlRequestsResponse', getControlResponseFromClient);
    }
    //RELEASE CONTROL REQUEST
    client.on("ReleaseControlRequest", sendReceiveControlrequest);
    function sendReceiveControlrequest() {
        var PartnerId = getPartnerId();
        client.broadcast.to(PartnerId).emit('releaseControlResponse');
    };


    //ondataupdate 
    client.on("onDataUpdate", onDataUpdate);
    function onDataUpdate(patientDetails) {
        var PartnerId = getPartnerId();
        client.broadcast.to(PartnerId).emit('onPartnerDataUpdate',patientDetails);
    };

    //***end****//initiate call//***end****//


    //***start****//message section//***start****//
    client.on("clientMessage", clientMessage);
    function clientMessage(data) {
        console.log(data);
        io.sockets.emit("serverMessage", data);
    };

    client.on("checkConnectionBwClients", checkConnectionBwClients);
    function checkConnectionBwClients(message) {
        var getroomId;
        usersList.map(n=> {
            if (client.id == n.key) {
                console.log("method" + n.value.roomId);
                getroomId = n.value.roomId;
            }
        });
        console.log("getroomid " + getroomId);

        client.broadcast.to(getroomId).emit("receiveMessage", message);
    };


    client.on("clientSentMessage", clientSentMessage);
    function clientSentMessage(message) {
        var getroomId;
        usersList.map(n=> {
            if (client.id == n.key) {
                console.log("method" + n.value.roomId);
                getroomId = n.value.roomId;
            }
        });
        console.log("getroomid " + getroomId);

        client.broadcast.to(getroomId).emit("receiveMessage", message);
    };
    //***end****//message section//***end****//


    //videoCallConnection signal transfer section
    client.on("sendSignal", sendSignal);
    function sendSignal(signal) {
        console.log(signal);
        var PartnerId = getPartnerId();
        client.broadcast.to(PartnerId).emit('newSignal', signal);
    };
    //videoCallConnection signal transfer section

    client.on("startVideoOnOtherSide", startVideoOnOtherSide);
    function startVideoOnOtherSide() {
        var PartnerId = getPartnerId();
        client.broadcast.to(PartnerId).emit('newSignal', "startVideo");

    };
};
