/* ---------- Sidebar Definition ---------- */

const SIDEBAR_ITEMS = [
    { id: 'navDashboard',      href: 'dashboard.html',         icon: 'ti-layout-dashboard', label: 'Dashboard',        roles: ['BOSS','OFFICE','MANAGER','EMPLOYEE'] },
    { id: 'navAttendance',     href: 'attendance.html',        icon: 'ti-clock',            label: 'Asistencia',       roles: ['BOSS','OFFICE','MANAGER','EMPLOYEE'] },
    { id: 'navAttendanceReport', href: 'attendance-report.html', icon: 'ti-report-analytics', label: 'Reporte Asistencia', roles: ['BOSS','OFFICE','MANAGER','EMPLOYEE'] },
    { id: 'navDelivery',       href: 'delivery.html',          icon: 'ti-truck-delivery',   label: 'Delivery',         roles: ['BOSS','OFFICE','MANAGER'] },
    { id: 'navPlanillas',      href: 'planillas.html',         icon: 'ti-file-spreadsheet', label: 'Planillas',        roles: ['BOSS','OFFICE','MANAGER'] },
    { id: 'navDamaged',        href: 'damaged.html',           icon: 'ti-box-off',          label: 'Bodega',           roles: ['BOSS','OFFICE','MANAGER'] },
    { id: 'navDamagedReport',  href: 'damaged-report.html',    icon: 'ti-search',           label: 'Reporte Bodega',   roles: ['BOSS','OFFICE','MANAGER'] },
    { id: 'navEmployees',      href: 'employees.html',         icon: 'ti-users',            label: 'Empleados',        roles: ['BOSS','OFFICE','MANAGER'] },
    { id: 'navUsers',          href: 'users.html',             icon: 'ti-user-cog',         label: 'Usuarios',         roles: ['BOSS','OFFICE'] }
];

const ROLES = {};
SIDEBAR_ITEMS.forEach(item => {
    item.roles.forEach(r => {
        if (!ROLES[r]) ROLES[r] = [];
        ROLES[r].push(item.id);
    });
});

// Dashboard also controls cards/quick-actions visibility — extend ROLES for those
ROLES.BOSS = ROLES.BOSS.concat(['cardAttendance','cardDelivery','cardDamaged','cardEmployees','cardUsers','qaAttendance','qaDelivery','qaDamaged','qaEmployees']);
ROLES.OFFICE = ROLES.OFFICE.concat(['cardAttendance','cardDelivery','cardDamaged','cardEmployees','cardUsers','qaAttendance','qaDelivery','qaDamaged','qaEmployees']);
ROLES.MANAGER = ROLES.MANAGER.concat(['cardAttendance','cardDelivery','cardDamaged','qaAttendance','qaDelivery','qaDamaged']);
ROLES.EMPLOYEE = ROLES.EMPLOYEE.concat(['cardAttendance','qaAttendance']);

/* ---------- Shared Utilities ---------- */

function getInitials(name) {
    return name.split(' ').map(n => n[0]?.toUpperCase() || '').join('').substring(0, 2) || 'US';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showAlert(msg, type) {
    const box = document.getElementById('alert');
    if (!box) return;
    box.textContent = msg;
    box.className = `alert alert-${type}`;
    box.style.display = 'block';
    setTimeout(() => { box.style.display = 'none'; }, type === 'success' ? 3500 : 5000);
}

/* ---------- Sidebar Builder ---------- */

function buildSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    const role = localStorage.getItem('role') || 'EMPLOYEE';
    const currentPage = window.location.pathname.split('/').pop();
    const allowedIds = ROLES[role] || ROLES['EMPLOYEE'];

    // Keep the "Navegación" label, rebuild links
    const label = nav.querySelector('.sidebar-label');
    nav.innerHTML = '';
    if (label) nav.appendChild(label);

    SIDEBAR_ITEMS.forEach(item => {
        if (!allowedIds.includes(item.id)) return;
        const a = document.createElement('a');
        a.href = item.href;
        a.className = `sidebar-link${currentPage === item.href ? ' active' : ''}`;
        a.id = item.id;
        a.innerHTML = `<i class="ti ${item.icon}"></i><span>${item.label}</span>`;
        nav.appendChild(a);
    });
}

/* ---------- Cleanup (shared) ---------- */

function cleanupOldPlanillas(months) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    let planillas = [];
    try { planillas = JSON.parse(localStorage.getItem('leaf_planillas') || '[]'); } catch {}
    const before = planillas.length;
    planillas = planillas.filter(p => p.date >= cutoffStr);
    const removed = before - planillas.length;
    localStorage.setItem('leaf_planillas', JSON.stringify(planillas));
    return removed;
}

/* ---------- App Initialization ---------- */

function initApp() {
    const username = localStorage.getItem('username') || 'Usuario';
    const role = localStorage.getItem('role') || 'EMPLOYEE';
    const initials = getInitials(username);

    // Avatar
    document.querySelectorAll('#avatarCircle, #avatarCircleTop').forEach(el => {
        if (el) el.textContent = initials;
    });

    // User info
    const setText = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    setText('navUsername', username);
    setText('navRole', role);
    setText('dropUsername', username);
    setText('dropRole', role);
    setText('welcomeMsg', `Bienvenido, ${username}`);

    // Logout
    document.querySelectorAll('#logoutBtn, #logoutBtnSidebar').forEach(el => {
        el?.addEventListener('click', e => { e.preventDefault(); logout(); });
    });

    // Sidebar
    buildSidebar();

    // Sidebar toggle + overlay
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
        overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
    }

    // Date
    setCurrentDate();
}

function setCurrentDate() {
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const d = new Date().toLocaleDateString('es-ES', opts);
    const el = document.getElementById('currentDate');
    if (el) el.textContent = d.charAt(0).toUpperCase() + d.slice(1);
}

document.addEventListener('DOMContentLoaded', initApp);
