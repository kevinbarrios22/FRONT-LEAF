
const USER_ROLES = ['BOSS', 'OFFICE', 'MANAGER', 'EMPLOYEE'];
const USER_STATUSES = ['Activo', 'Inactivo'];

let nextUserId = 1;

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initUsers();
});

function initUsers() {
    document.getElementById('btnRefresh')?.addEventListener('click', loadUsers);
    document.getElementById('btnSave')?.addEventListener('click', saveUsers);
    document.getElementById('btnAddRow')?.addEventListener('click', () => addRow(true));
    loadUsers();
}

function loadUsers() {
    const tbody = document.getElementById('usrBody');
    if (!tbody) return;

    let data = [];
    try {
        const stored = localStorage.getItem('leaf_users');
        if (stored) data = JSON.parse(stored);
        if (!Array.isArray(data)) data = [];
    } catch {
        data = [];
    }

    const seenIds = new Set();
    for (const user of data) {
        if (user.id == null || seenIds.has(user.id)) {
            while (seenIds.has(nextUserId)) nextUserId++;
            user.id = nextUserId++;
            seenIds.add(user.id);
        } else {
            seenIds.add(user.id);
            if (user.id >= nextUserId) nextUserId = user.id + 1;
        }
    }

    tbody.innerHTML = '';

    data.forEach(user => {
        appendRow(tbody, user.id, user.username || '', user.fullName || '', user.password || '', user.role || 'EMPLOYEE', user.active !== false ? 'Activo' : 'Inactivo');
    });

    if (data.length === 0) {
        appendRow(tbody, nextUserId++, '', '', '', 'EMPLOYEE', 'Activo');
    }

    bindRowEvents(tbody);
    updateSummary();
}

function appendRow(tbody, id, username, fullName, password, role, status) {
    const tr = document.createElement('tr');
    tr.dataset.id = id;
    tr.innerHTML = `
        <td>
            <input type="text" class="gen-input-text" value="${escapeHtml(username)}" placeholder="Nombre de usuario" data-field="username" />
        </td>
        <td>
            <input type="text" class="gen-input-text" value="${escapeHtml(fullName)}" placeholder="Nombre completo" data-field="fullName" />
        </td>
        <td>
            <input type="password" class="gen-input-text" value="${escapeHtml(password)}" placeholder="Contraseña" data-field="password" />
        </td>
        <td>
            <select class="gen-select" data-field="role">
                ${USER_ROLES.map(r => `<option value="${r}" ${role === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
        </td>
        <td>
            <select class="gen-select" data-field="status">
                ${USER_STATUSES.map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </td>
        <td class="gen-col-actions">
            <button class="gen-btn-icon gen-btn-delete" title="Eliminar fila"><i class="ti ti-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
}

function bindRowEvents(tbody) {
    tbody.querySelectorAll('.gen-btn-delete').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
            const tr = this.closest('tr');
            if (tr) tr.remove();
            updateSummary();
            ensureLastRow();
        });
    });

    tbody.querySelectorAll('[data-field="username"]').forEach(inp => {
        if (inp.dataset.bound) return;
        inp.dataset.bound = '1';
        inp.addEventListener('input', function () {
            const tr = this.closest('tr');
            if (tr && isLastRow(tr)) {
                addRow(false);
            }
        });
    });

    tbody.querySelectorAll('[data-field="role"]').forEach(sel => {
        if (sel.dataset.bound) return;
        sel.dataset.bound = '1';
        sel.addEventListener('change', updateSummary);
    });
}

function isLastRow(tr) {
    const tbody = tr.closest('tbody');
    if (!tbody) return false;
    const rows = tbody.querySelectorAll('tr');
    return rows.length > 0 && tr === rows[rows.length - 1];
}

function ensureLastRow() {
    const tbody = document.getElementById('usrBody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
        appendRow(tbody, nextUserId++, '', '', '', 'EMPLOYEE', 'Activo');
        bindRowEvents(tbody);
    } else {
        const last = rows[rows.length - 1];
        const inp = last.querySelector('[data-field="username"]');
        if (inp && inp.value.trim() !== '') {
            addRow(false);
        }
    }
    updateSummary();
}

function addRow(focus) {
    const tbody = document.getElementById('usrBody');
    if (!tbody) return;
    appendRow(tbody, nextUserId++, '', '', '', 'EMPLOYEE', 'Activo');
    bindRowEvents(tbody);
    updateSummary();
    if (focus) {
        const rows = tbody.querySelectorAll('tr');
        const last = rows[rows.length - 1];
        const inp = last?.querySelector('[data-field="username"]');
        inp?.focus();
    }
}

function updateSummary() {
    const rows = document.querySelectorAll('#usrBody tr');
    const total = rows.length;
    const counts = { BOSS: 0, OFFICE: 0, MANAGER: 0, EMPLOYEE: 0 };
    rows.forEach(tr => {
        const sel = tr.querySelector('[data-field="role"]');
        if (sel && counts[sel.value] !== undefined) counts[sel.value]++;
    });

    const el = id => document.getElementById(id);
    if (el('sumTotal')) el('sumTotal').textContent = total;
    if (el('sumBOSS')) el('sumBOSS').textContent = counts.BOSS;
    if (el('sumOFFICE')) el('sumOFFICE').textContent = counts.OFFICE;
    if (el('sumMANAGER')) el('sumMANAGER').textContent = counts.MANAGER;
    if (el('sumEMPLOYEE')) el('sumEMPLOYEE').textContent = counts.EMPLOYEE;
}

function saveUsers() {
    const rows = [];
    document.querySelectorAll('#usrBody tr').forEach(tr => {
        const username = tr.querySelector('[data-field="username"]')?.value?.trim() || '';
        if (!username) return;
        rows.push({
            id: parseInt(tr.dataset.id) || nextUserId++,
            username,
            fullName: tr.querySelector('[data-field="fullName"]')?.value?.trim() || '',
            password: tr.querySelector('[data-field="password"]')?.value || '',
            role: tr.querySelector('[data-field="role"]')?.value || 'EMPLOYEE',
            active: tr.querySelector('[data-field="status"]')?.value === 'Activo'
        });
    });

    if (!rows.length) {
        showAlert('No hay datos para guardar', 'warning');
        return;
    }

    localStorage.setItem('leaf_users', JSON.stringify(rows));
    showAlert(`${rows.length} usuario(s) guardado(s)`, 'success');
}


