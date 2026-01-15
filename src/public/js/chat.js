document.getElementById('chat').innerHTML = `
    <div class="card shadow-lg border-0 rounded-4" style="max-width:700px;margin:auto;">
        <div class="card-body p-4">
            <h2 class="card-title fw-bold mb-3 text-center">Phòng chat VAChat</h2>
            <div id="messages" style="height:300px;overflow-y:auto;background:#f8f9fa;border-radius:1rem;padding:1rem;margin-bottom:1rem;"></div>
            <form id="chatForm" class="d-flex">
                <input type="text" id="chatInput" class="form-control me-2" placeholder="Nhập tin nhắn..." required />
                <button type="submit" class="btn btn-primary">Gửi</button>
            </form>
        </div>
    </div>
`;

const socket = io();
const messagesDiv = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

chatForm.onsubmit = function (e) {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg) {
        socket.emit('chat message', msg);
        chatInput.value = '';
    }
};

socket.on('chat message', function (msg) {
    const div = document.createElement('div');
    div.textContent = msg;
    div.className = "mb-2";
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
