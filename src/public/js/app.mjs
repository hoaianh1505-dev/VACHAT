import { socket, registerUser } from './socket.mjs';
import { initMessages } from './chat.mjs';
import { initFriends } from './friends.mjs';

// --- Bootstrap ---
initMessages({ socket });
initFriends({ socket });

// Expose socket for debugging
if (typeof window !== 'undefined') {
    window.socketClient = { socket, register: registerUser };
}
