// load socket client if present
if (window && window.socketClient && window.userId) {
    window.socketClient.register(window.userId);
}
