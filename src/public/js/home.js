// ...home page JS...
document.addEventListener('DOMContentLoaded', function () {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const messages = document.getElementById('messages');

    if (chatForm) {
        chatForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const msg = messageInput.value.trim();
            if (msg) {
                const div = document.createElement('div');
                div.textContent = 'Bạn: ' + msg;
                messages.appendChild(div);
                messageInput.value = '';
            }
        });
    }
});
