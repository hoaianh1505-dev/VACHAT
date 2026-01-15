const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI);

// Serve static files (js, css, images)
app.use(express.static(__dirname + '/public'));

// View routes (serve HTML from src/view)
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/view/login.html');
});

app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/view/home.html');
});

app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/view/chat.html');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/view/index.html');
});

// API routes (MVC)
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`App URL: http://localhost:${PORT}/`);
});
