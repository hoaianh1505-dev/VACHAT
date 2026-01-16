import { socket, register } from './socket-client.mjs';
import { initMessages } from './messages.mjs';
import { initFriends } from './friends.mjs';

document.addEventListener('DOMContentLoaded', () => {
    // Register socket id for this user
    if (window.userId) register(window.userId);

    // Initialize modules after DOM is ready
    initMessages({ socket });
    initFriends({ socket });

    // expose socket for debugging if needed
    window._avchatSocket = socket;
});
