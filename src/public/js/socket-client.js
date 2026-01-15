const socket = io();

socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
});
