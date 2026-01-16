require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default; // Sửa lại import .default

// Đăng ký schema Group trước khi sử dụng populate
require('./models/Group');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

io.userSocketMap = {}; // Khởi tạo map trước khi truyền vào socketHandlers

app.set('io', io); // Thêm dòng này

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }) // Sử dụng .create()
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
socketHandlers(io);

// Expose userSocketMap cho route sử dụng

app.use('/', homeRoute);
app.use('/', loginRoute);
app.use('/auth', authRoute);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`App link: http://localhost:${PORT}`);
});
