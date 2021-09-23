const { strictEqual } = require('assert');
var express = require('express');
const { SocketAddress } = require('net');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
serv.listen(8080);
console.log('Server Started!');
var SOCKET_LIST = {};
var Entity = function() {
    var self = {
        x:250,
        y:250,
        spdX:0,
        spdY:0,
        id:"",
    }
    self.update = function() {
        self.updatePosition();
    }
    self.updatePosition = function() {
        self.x += self.spdX;
        self.y += self.spdY;
    }
    return self;
}
var Player = function(id) {
    var self = Entity()
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 5;
    var super_update = self.update;
    self.update = function() {
        self.updateSpd();
        super_update();
    }
    self.updateSpd = function() {
        if(self.pressingRight)
            self.spdX = self.maxSpd;
        else if(self.pressingLeft)
            self.spdX = -self.maxSpd;
        else
            self.spdX = 0;
        if(self.pressingDown)
            self.spdY = self.maxSpd;
        else if(self.pressingUp)
            self.spdY = -self.maxSpd;
        else
            self.spdY = 0;
    }
    Player.list[id] = self;
    return self;
}
Player.list = {};
Player.onConnect = function(s) {
    var player = Player(s.id);
    s.on('keyPress',function(data){
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
    });
}
Player.onDisconnect = function(s) {
    delete Player.list[s.id];
}
Player.update = function() {
    var pack = [];
    for(var i in Player.list) {
        var player = Player.list[i];
        player.update();
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number
        })
    }
    return pack;
}
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    Player.onConnect(socket)
    console.log(`Connection with id ${socket.id}`);;
    SOCKET_LIST[socket.id] = socket;
    socket.on('disconnect', function() {
        console.log(`${socket.id} disconnected`)
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket)
    });
});
setInterval(function() {
    var pack = Player.update();
    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions', pack);
    }
}, 1000/25);