// Express.js app

const settings = require('./settings');

const {
  DIALOGUE_SYSTEM_HOST,
  DIALOGUE_SYSTEM_PORT,
  BUDGIE_WEB_HOST,
  BUDGIE_WEB_PORT,
  BUDGIE_WEB_SOCKET_HOST,
  BUDGIE_WEB_SOCKET_PORT
} = settings;

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const ioClient = require('socket.io-client');
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*", // Update to match the URL of your Django app
        methods: ["GET", "POST"]
    }
});

// Use CORS
app.use(cors({
    origin: BUDGIE_WEB_HOST + ':' + BUDGIE_WEB_PORT, // Update to match the URL of your Django app
    credentials: true,
}));

// Connect to Flask Socket.IO server
const flaskSocket = ioClient.connect(DIALOGUE_SYSTEM_HOST + ':' + DIALOGUE_SYSTEM_PORT);

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

server.listen(BUDGIE_WEB_SOCKET_PORT, () => {
    console.log('Listening on port 3000');
});
