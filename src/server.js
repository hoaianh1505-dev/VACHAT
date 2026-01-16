require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'vachat_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // secure: true nếu dùng HTTPS
}));

// Static & View
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routers
app.use('/login', require('./routes/login'));
app.use('/auth', require('./routes/auth'));
app.use('/home', require('./routes/home'));
app.use('/users', require('./routes/users'));
app.use('/messages', require('./routes/messages'));
app.use('/groups', require('./routes/groups'));
app.use('/friends', require('./routes/friends'));
app.use('/conversations', require('./routes/conversations'));
app.use('/ai', require('./routes/ai'));

// Basic route
app.get('/', (req, res) => {
    res.render('index'); // src/view/index.ejs
});

// Socket.IO setup
io.on('connection', (socket) => {
    require('./socket/socketHandlers')(io, socket);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
