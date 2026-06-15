const DUMMY_TOKEN = 'demo-token';

function saveSession(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('role', data.role);
}

function getRoleFromUsername(username) {
    const normalized = username.toLowerCase();
    if (normalized.includes('admin') || normalized.includes('boss')) return 'BOSS';
    if (normalized.includes('office')) return 'OFFICE';
    if (normalized.includes('manager')) return 'MANAGER';
    return 'EMPLOYEE';
}

function requireAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function findSavedUser(username, password) {
    try {
        const stored = localStorage.getItem('leaf_users');
        if (!stored) return null;
        const users = JSON.parse(stored);
        if (!Array.isArray(users)) return null;
        return users.find(u =>
            u.username?.toLowerCase() === username.toLowerCase() &&
            u.password === password &&
            u.active !== false
        ) || null;
    } catch {
        return null;
    }
}

function initLogin() {
    document.getElementById('loginForm')?.addEventListener('submit', function (event) {
        event.preventDefault();
        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value.trim();
        if (!username || !password) {
            alert('Por favor completa usuario y contraseña.');
            return;
        }

        const savedUser = findSavedUser(username, password);

        if (savedUser) {
            saveSession({
                token: DUMMY_TOKEN,
                username: savedUser.username,
                role: savedUser.role
            });
        } else if (!localStorage.getItem('leaf_users') || JSON.parse(localStorage.getItem('leaf_users') || '[]').length === 0) {
            saveSession({
                token: DUMMY_TOKEN,
                username,
                role: getRoleFromUsername(username)
            });
        } else {
            alert('Usuario o contraseña incorrectos.');
            return;
        }

        window.location.href = 'dashboard.html';
    });
}

function initPasswordToggle() {
    document.getElementById('togglePassword')?.addEventListener('click', function (event) {
        event.preventDefault();
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return;
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        const icon = this.querySelector('i');
        if (icon) {
            icon.classList.toggle('ti-eye');
            icon.classList.toggle('ti-eye-off');
        }
    });
}

initPasswordToggle();
initLogin();
