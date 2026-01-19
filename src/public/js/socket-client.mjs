const backend = (typeof window !== 'undefined' && window.BACKEND_URL) ? window.BACKEND_URL.replace(/\/$/, '') : '';
export const socket = backend
    ? io(backend, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        path: '/socket.io'
    })
    : io(); // same-origin

let _pendingRegisterUserId = null;

function _doRegister(id) {
    try {
        if (!id) return;
        if (socket && socket.connected) {
            socket.emit('register-user', String(id));
        } else {
            // keep pending and will send on connect
            _pendingRegisterUserId = String(id);
        }
    } catch (e) { /* noop */ }
}

// auto-send pending register on connect / reconnect
socket.on('connect', () => {
    if (_pendingRegisterUserId) {
        try { socket.emit('register-user', _pendingRegisterUserId); } catch (e) { }
    }
});

// also ensure re-register on reconnection attempts
socket.on('reconnect', () => {
    if (_pendingRegisterUserId) {
        try { socket.emit('register-user', _pendingRegisterUserId); } catch (e) { }
    }
});

// public API
export function register(userId) {
    if (!userId) return;
    _pendingRegisterUserId = String(userId);
    _doRegister(userId);
}

export default { socket, register };
