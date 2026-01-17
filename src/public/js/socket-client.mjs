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

export function register(userId) {
    if (userId) socket.emit('register-user', String(userId));
}
export default { socket, register };
