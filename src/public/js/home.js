document.getElementById('app').innerHTML = `
    <div class="card shadow-lg border-0 rounded-4" style="max-width:500px;margin:auto;">
        <div class="card-body text-center p-5">
            <img src="https://ui-avatars.com/api/?name=VAChat&background=0d6efd&color=fff&size=80" class="rounded-circle shadow-sm mb-3" alt="Logo" width="80" height="80">
            <h1 class="card-title fw-bold mb-3">VAChat</h1>
            <p class="lead text-muted mb-4">Chào mừng bạn đến với VAChat!</p>
            <a href="chat.html" class="btn btn-primary btn-lg px-5 mt-2 shadow-sm">Vào phòng chat</a>
            <button id="logoutBtn" class="btn btn-outline-danger btn-lg px-5 mt-2 shadow-sm">Đăng xuất</button>
        </div>
    </div>
`;

window.addEventListener('DOMContentLoaded', function () {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function () {
            localStorage.removeItem('token');
            window.location.href = "/login";
        };
    }
});
