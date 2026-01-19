const backend = (typeof window !== 'undefined' && window.BACKEND_URL) ? window.BACKEND_URL.replace(/\/$/, '') : '';
const initialUserId = (typeof window !== 'undefined' && window.userId) ? String(window.userId) : null;

export const socket = backend
    ? io(backend, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        path: '/socket.io',
        auth: { userId: initialUserId }
    })
    : io({ auth: { userId: initialUserId } }); // same-origin

let _pendingRegisterUserId = initialUserId || null;

function _doRegister(id) {
    try {
        if (!id) return;
        _pendingRegisterUserId = String(id);
        // set auth so reconnects include userId
        if (socket && socket.auth) socket.auth.userId = _pendingRegisterUserId;
        if (socket && socket.connected) {
            socket.emit('register-user', String(id));
        }
    } catch (e) { /* noop */ }
}

// auto-send pending register on connect
socket.on('connect', () => {
    if (_pendingRegisterUserId) {
        try { socket.emit('register-user', _pendingRegisterUserId); } catch (e) { }
    }
});

// ensure auth carried on reconnect attempts
socket.on('reconnect_attempt', () => {
    if (_pendingRegisterUserId && socket && socket.auth) socket.auth.userId = _pendingRegisterUserId;
});

// public API
export function register(userId) {
    if (!userId) return;
    _doRegister(userId);
}

export default { socket, register };
