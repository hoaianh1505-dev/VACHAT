
// Socket Initialization Module
const initialUserId = (typeof window !== 'undefined' && window.userId) ? String(window.userId) : null;

// Ensure io is available
export const socket = (typeof io !== 'undefined') ? io({ auth: { userId: initialUserId } }) : null;

if (!socket) console.error('Socket.IO client not found');


if (socket) {
    // Optional: Add basic connection logging
    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
    });
}

