export const socket = io(); // assumes /socket.io/socket.io.js loaded globally

export function register(userId) {
    if (userId) socket.emit('register-user', String(userId));
}

export default { socket, register };
