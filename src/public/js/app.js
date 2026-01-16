// ...frontend app logic...
function showLogin() {
    document.getElementById('login').innerHTML = `
        <div class="login-card">
            <div class="card-body">
                <div class="text-center" style="display:flex;flex-direction:column;align-items:center;">
                    <span class="login-logo" style="margin-bottom:12px;">
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                            <circle cx="40" cy="40" r="38" fill="#23272f" stroke="#3b82f6" stroke-width="4"/>
                            <text x="50%" y="54%" text-anchor="middle" fill="#43ea7c" font-size="32" font-family="Segoe UI, Arial, sans-serif" font-weight="bold" dy=".3em">VA</text>
                        </svg>
                    </span>
                    <div class="login-title">Chào mừng đến VAChat</div>
                    <div class="login-desc">Đăng nhập để tiếp tục</div>
                </div>
                <form id="loginForm" autocomplete="off">
                    <input type="email" id="loginEmail" class="form-control-lg" placeholder="Email" autocomplete="off" required />
                    <input type="password" id="loginPassword" class="form-control-lg" placeholder="Mật khẩu" autocomplete="off" required />
                    <button type="submit" class="btn-lg">Đăng nhập</button>
                </form>
                <p class="text-muted" style="text-align:center;">Chưa có tài khoản? <a href="#" id="showRegisterLink" class="login-link">Đăng ký</a></p>
                <div id="loginError" class="text-danger" style="text-align:center;margin-top:0.5rem;"></div>
            </div>
        </div>
        <div id="popupLoginSuccess" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#23272f;color:#43ea7c;padding:1rem 2rem;border-radius:0.5rem;box-shadow:0 2px 12px #3b82f6;z-index:999;font-size:1rem;text-align:center;">
            Đăng nhập thành công!
        </div>
    `;
    document.getElementById('app').style.display = 'none';

    document.getElementById('loginForm').onsubmit = async function (e) {
        e.preventDefault();
        console.log('Login button clicked');
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                document.getElementById('popupLoginSuccess').style.display = 'block';
                setTimeout(() => {
                    window.location.href = "/home";
                }, 1200);
            } else {
                document.getElementById('loginError').innerText = data.message || 'Đăng nhập thất bại';
            }
        } catch (err) {
            document.getElementById('loginError').innerText = 'Lỗi đăng nhập';
        }
    };

    document.getElementById('showRegisterLink').onclick = function (e) {
        e.preventDefault();
        console.log('Show register link clicked');
        showRegister();
    };
}

function showRegister() {
    document.getElementById('login').innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="text-center" style="margin-bottom:2rem;">
                    <span style="display:inline-block;width:80px;height:80px;margin-bottom:8px;">
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                            <circle cx="40" cy="40" r="38" fill="#23272f" stroke="#43ea7c" stroke-width="4"/>
                            <text x="50%" y="54%" text-anchor="middle" fill="#3b82f6" font-size="32" font-family="Segoe UI, Arial, sans-serif" font-weight="bold" dy=".3em">VA</text>
                        </svg>
                    </span>
                    <h2 style="font-weight:bold;margin-top:1rem;">Tạo tài khoản mới</h2>
                    <p class="text-muted" style="margin-bottom:0.5rem;">Đăng ký để bắt đầu trò chuyện</p>
                </div>
                <form id="registerForm">
                    <input type="text" id="registerUsername" class="form-control-lg" placeholder="Tên đăng nhập" required />
                    <input type="password" id="registerPassword" class="form-control-lg" placeholder="Mật khẩu" required />
                    <input type="email" id="registerEmail" class="form-control-lg" placeholder="Email" required />
                    <button type="submit" class="btn-lg btn-success">Đăng ký</button>
                </form>
                <p class="text-muted" style="text-align:center;">Đã có tài khoản? <a href="#" id="showLoginLink" style="font-weight:bold;">Đăng nhập</a></p>
                <div id="registerError" class="text-danger" style="text-align:center;margin-top:0.5rem;"></div>
            </div>
        </div>
        <div id="popupSuccess" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#23272f;color:#43ea7c;padding:1rem 2rem;border-radius:0.5rem;box-shadow:0 2px 12px #3b82f6;z-index:999;font-size:1rem;text-align:center;">
            Đăng ký thành công!
        </div>
    `;
    document.getElementById('app').style.display = 'none';

    document.getElementById('registerForm').onsubmit = async function (e) {
        e.preventDefault();
        console.log('Register button clicked');
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const email = document.getElementById('registerEmail').value.trim();
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('popupSuccess').style.display = 'block';
                setTimeout(() => {
                    window.location.href = "/login";
                }, 1200);
            } else {
                document.getElementById('registerError').innerText = data.message || 'Đăng ký thất bại';
            }
        } catch (err) {
            document.getElementById('registerError').innerText = 'Lỗi đăng ký';
        }
    };

    document.getElementById('showLoginLink').onclick = function (e) {
        e.preventDefault();
        console.log('Show login link clicked');
        showLogin();
    };
}

function showApp() {
    document.getElementById('login').innerHTML = '';
    document.getElementById('app').style.display = '';
    document.getElementById('app').innerHTML = `
        <div class="card" style="max-width:500px;margin:auto;">
            <div class="card-body" style="text-align:center;">
                <span style="display:inline-block;width:80px;height:80px;margin-bottom:8px;">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                        <circle cx="40" cy="40" r="38" fill="#23272f" stroke="#3b82f6" stroke-width="4"/>
                        <text x="50%" y="54%" text-anchor="middle" fill="#43ea7c" font-size="32" font-family="Segoe UI, Arial, sans-serif" font-weight="bold" dy=".3em">VA</text>
                    </svg>
                </span>
                <h1 style="font-weight:bold;margin-bottom:1rem;">VAChat UI</h1>
                <p class="text-muted" style="margin-bottom:1.5rem;">Chào mừng bạn đến với VAChat!</p>
                <button id="logoutBtn" class="btn-lg btn-outline-danger">Đăng xuất</button>
            </div>
        </div>
    `;
    document.getElementById('logoutBtn').onclick = function () {
        localStorage.removeItem('token');
        window.location.href = "/login";
    };
}

// Animate.css CDN for fadeIn effect
if (!document.getElementById('animateCss')) {
    const link = document.createElement('link');
    link.id = 'animateCss';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css';
    document.head.appendChild(link);
}

// KHÔNG gọi showLogin/showApp tự động ở cuối file
