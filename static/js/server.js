// Express.js app

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const ioClient = require('socket.io-client');
const cors = require('cors');
const {setting_variables} = require("./settings");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: setting_variables.BUDGIE_WEB_HOST + ':' + setting_variables.BUDGIE_WEB_PORT, // Update to match the URL of your Django app
        methods: ["GET", "POST"]
    }
});

// Use CORS
app.use(cors({
    origin: setting_variables.BUDGIE_WEB_HOST + ':' + setting_variables.BUDGIE_WEB_PORT, // Update to match the URL of your Django app
    credentials: true
}));

// Connect to Flask Socket.IO server
const flaskSocket = ioClient.connect(setting_variables.DIALOGUE_SYSTEM_HOST + ':' + setting_variables.DIALOGUE_SYSTEM_PORT);

flaskSocket.on('stream_message', (data) => {
    console.log('Received message from Flask:', data);
    io.emit('stream_message', data);
});

io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(setting_variables.BUDGIE_WEB_SOCKET_PORT, () => {
    console.log('Listening on port 3000');
});
