
// Socket Initialization Module
const backend = (typeof window !== 'undefined' && window.BACKEND_URL) ? window.BACKEND_URL.replace(/\/$/, '') : '';
const initialUserId = (typeof window !== 'undefined' && window.userId) ? String(window.userId) : null;

// Ensure io is available
export const socket = (typeof io !== 'undefined') ? (backend
    ? io(backend, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        path: '/socket.io',
        auth: { userId: initialUserId }
    })
    : io({ auth: { userId: initialUserId } })) : null;

if (!socket) console.error('Socket.IO client not found');

let _pendingRegisterUserId = initialUserId || null;

function _doRegister(id) {
    try {
        if (!id) return;
        _pendingRegisterUserId = String(id);
        if (socket && socket.auth) socket.auth.userId = _pendingRegisterUserId;
        if (socket && socket.connected) {
            socket.emit('register-user', String(id));
        }
    } catch (e) { /* noop */ }
}

if (socket) {
    socket.on('connect', () => {
        if (_pendingRegisterUserId) {
            try { socket.emit('register-user', _pendingRegisterUserId); } catch (e) { }
        }
    });

    socket.on('reconnect_attempt', () => {
        if (_pendingRegisterUserId && socket && socket.auth) socket.auth.userId = _pendingRegisterUserId;
    });
}

export function registerUser(userId) {
    if (!userId) return;
    _doRegister(userId);
}

// Expose legacy global
if (typeof window !== 'undefined') {
    window.socketClient = { socket, register: registerUser };
}
