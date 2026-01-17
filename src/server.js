// thay vì require('dotenv').config(); dùng config/environment
const env = require('./config/environment');
const db = require('./config/database');
const socketConfig = require('./config/socket');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default; // Sửa lại import .default
const middleware = require('./middleware'); // <-- mới: tập trung middleware

// Đăng ký schema Group trước khi sử dụng populate
require('./models/Group');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// initialize socket map + handlers via config
socketConfig(io);

app.set('io', io); // Thêm dòng này

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: env.MONGO_URI }),
    cookie: {
        secure: (process.env.NODE_ENV === 'production'), // https only in prod
        sameSite: 'lax' // allow sending cookie on same-site navigations/fetches
    }
}));

// trust proxy in production (if behind a proxy/load balancer)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Thêm logger và CORS middleware (sau body parser, trước routes)
app.use(middleware.requestLogger);
app.use(middleware.cors);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// MongoDB connect (dùng module)
db.connect()
    .then(() => {
        console.log('MongoDB connected');
        // show whether GEMINI key is configured (do not print the key)
        const env = require('./config/environment');
        if (env.GEMINI_API_KEY) console.log('Gemini API key: configured');
        else console.log('Gemini API key: NOT configured — AI will fallback to local generator.');
    })
    .catch(err => console.error('MongoDB error:', err));

// Routes
const homeRoute = require('./routes/home');
const loginRoute = require('./routes/login');
const authRoute = require('./routes/auth');
// new API routes
const usersApiRoute = require('./routes/users');
const messagesApiRoute = require('./routes/messages');
const groupsApiRoute = require('./routes/groups');
const friendsApiRoute = require('./routes/friends');
const aiApiRoute = require('./routes/ai');

const socketHandlers = require('./socket/socketHandlers');
// socketHandlers(io); // <-- removed duplicate call (socketConfig already initialized handlers)

app.use('/', homeRoute);
app.use('/', loginRoute);
app.use('/auth', authRoute);

// mount API routes under /api
app.use('/api/users', usersApiRoute);
app.use('/api/messages', messagesApiRoute);
app.use('/api/groups', groupsApiRoute);
app.use('/api/friends', friendsApiRoute);
app.use('/api/ai', aiApiRoute);

// Thêm error handler cuối cùng
app.use(middleware.errorHandler);

// Start server
const PORT = env.PORT || process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`App link: http://localhost:${PORT}`);
});
