// Lightweight loader: import module socket-client.mjs into a global window.socketClient
(function () {
    // ...existing runtime checks...
    if (typeof window === 'undefined') return;
    if (window.socketClient) return;
    const s = document.createElement('script');
    s.type = 'module';
    // dynamic module content imports the canonical mjs and exposes window.socketClient
    s.textContent = `
		import { socket, register } from '/js/socket-client.mjs';
		window.socketClient = { socket, register };
	`;
    document.head.appendChild(s);
})();
