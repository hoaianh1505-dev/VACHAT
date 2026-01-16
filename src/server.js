require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const path = require('path');
const session = require('express-session');

// Đăng ký schema Group trước khi sử dụng populate
require('./models/Group');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

// Routes
const homeRoute = require('./routes/home');
const loginRoute = require('./routes/login');
const authRoute = require('./routes/auth');
const socketHandlers = require('./socket/socketHandlers');

app.use('/', homeRoute);
app.use('/', loginRoute);
app.use('/auth', authRoute);

socketHandlers(io);

// Socket.io handlers
io.on('connection', (socket) => {
    // ...socket handlers...
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`App link: http://localhost:${PORT}`);
});
