
const DEPARTMENTS = ['Administración', 'Almacén', 'Delivery', 'Ventas', 'Otro'];
const EMP_STATUSES = ['Activo', 'Inactivo'];

let nextEmpId = 1;

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initEmployees();
});

function initEmployees() {
    document.getElementById('btnRefresh')?.addEventListener('click', loadEmployees);
    document.getElementById('btnSave')?.addEventListener('click', saveEmployees);
    document.getElementById('btnAddRow')?.addEventListener('click', () => addRow(true));
    loadEmployees();
}

function loadEmployees() {
    const tbody = document.getElementById('empBody');
    if (!tbody) return;

    let data = [];
    try {
        const stored = localStorage.getItem('leaf_employees');
        if (stored) data = JSON.parse(stored);
        if (!Array.isArray(data)) data = [];
    } catch {
        data = [];
    }

    // --- Deduplicate IDs and migrate attendance records ---
    const seenIds = new Set();
    const idMigration = {}; // oldId -> [newIds assigned to its duplicates]
    let needsReSave = false;

    for (const emp of data) {
        if (emp.id == null || seenIds.has(emp.id)) {
            needsReSave = true;
            const oldId = emp.id;
            while (seenIds.has(nextEmpId)) nextEmpId++;
            emp.id = nextEmpId++;
            seenIds.add(emp.id);
            if (oldId != null) {
                if (!idMigration[oldId]) idMigration[oldId] = [];
                idMigration[oldId].push(emp.id);
            }
        } else {
            seenIds.add(emp.id);
            if (emp.id >= nextEmpId) nextEmpId = emp.id + 1;
        }
    }

    if (needsReSave) {
        localStorage.setItem('leaf_employees', JSON.stringify(data));

        // Migrate attendance records: Nth record with oldId -> Nth duplicate employee
        const migratedOldIds = Object.keys(idMigration);
        if (migratedOldIds.length > 0) {
            try {
                const attAll = JSON.parse(localStorage.getItem('leaf_attendance') || '{}');
                let attMigrated = false;
                for (const dateStr of Object.keys(attAll)) {
                    const records = attAll[dateStr];
                    if (!Array.isArray(records)) continue;
                    for (const [oldIdStr, newIds] of Object.entries(idMigration)) {
                        const oldIdNum = parseInt(oldIdStr);
                        let matchIndex = 0;
                        for (const rec of records) {
                            if (rec.employeeId === oldIdNum) {
                                if (matchIndex > 0) {
                                    const targetId = newIds[Math.min(matchIndex - 1, newIds.length - 1)];
                                    rec.employeeId = targetId;
                                    attMigrated = true;
                                }
                                matchIndex++;
                            }
                        }
                    }
                }
                if (attMigrated) {
                    localStorage.setItem('leaf_attendance', JSON.stringify(attAll));
                }
            } catch (e) {
                // Best effort — user can re-enter attendance for affected employees
            }
        }
    }
    // --- End deduplication ---

    tbody.innerHTML = '';

    data.forEach(emp => {
        appendRow(tbody, emp.id, emp.name || '', emp.email || '', emp.phone || '', emp.department || 'Administración', emp.active !== false ? 'Activo' : 'Inactivo');
    });

    if (data.length === 0) {
        appendRow(tbody, nextEmpId++, '', '', '', 'Administración', 'Activo');
    }

    bindRowEvents(tbody);
    updateSummary();
}

function appendRow(tbody, id, name, email, phone, department, status) {
    const tr = document.createElement('tr');
    tr.dataset.id = id;
    tr.innerHTML = `
        <td>
            <input type="text" class="gen-input-text" value="${escapeHtml(name)}" placeholder="Nombre completo" data-field="name" />
        </td>
        <td>
            <input type="text" class="gen-input-text" value="${escapeHtml(email)}" placeholder="correo@ejemplo.com" data-field="email" />
        </td>
        <td>
            <input type="text" class="gen-input-text" value="${escapeHtml(phone)}" placeholder="+57 300 000 0000" data-field="phone" />
        </td>
        <td>
            <select class="gen-select" data-field="department">
                ${DEPARTMENTS.map(d => `<option value="${d}" ${department === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
        </td>
        <td>
            <select class="gen-select" data-field="status">
                ${EMP_STATUSES.map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
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

    tbody.querySelectorAll('[data-field="name"]').forEach(inp => {
        if (inp.dataset.bound) return;
        inp.dataset.bound = '1';
        inp.addEventListener('input', function () {
            const tr = this.closest('tr');
            if (tr && isLastRow(tr)) {
                addRow(false);
            }
        });
    });

    tbody.querySelectorAll('[data-field="status"]').forEach(sel => {
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
    const tbody = document.getElementById('empBody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
        appendRow(tbody, nextEmpId++, '', '', '', 'Administración', 'Activo');
        bindRowEvents(tbody);
    }
    updateSummary();
}

function addRow(focus) {
    const tbody = document.getElementById('empBody');
    if (!tbody) return;
    appendRow(tbody, nextEmpId++, '', '', '', 'Administración', 'Activo');
    bindRowEvents(tbody);
    updateSummary();
    if (focus) {
        const rows = tbody.querySelectorAll('tr');
        const last = rows[rows.length - 1];
        const inp = last?.querySelector('[data-field="name"]');
        inp?.focus();
    }
}

function updateSummary() {
    const rows = document.querySelectorAll('#empBody tr');
    let total = 0;
    let active = 0;
    let inactive = 0;
    rows.forEach(tr => {
        const name = tr.querySelector('[data-field="name"]')?.value?.trim() || '';
        if (!name) return;
        total++;
        const sel = tr.querySelector('[data-field="status"]');
        if (sel) {
            if (sel.value === 'Activo') active++;
            else inactive++;
        }
    });

    const el = id => document.getElementById(id);
    if (el('sumTotal')) el('sumTotal').textContent = total;
    if (el('sumActive')) el('sumActive').textContent = active;
    if (el('sumInactive')) el('sumInactive').textContent = inactive;
}

function saveEmployees() {
    const rows = [];
    document.querySelectorAll('#empBody tr').forEach(tr => {
        const name = tr.querySelector('[data-field="name"]')?.value?.trim() || '';
        if (!name) return;
        rows.push({
            id: parseInt(tr.dataset.id) || nextEmpId++,
            name,
            email: tr.querySelector('[data-field="email"]')?.value?.trim() || '',
            phone: tr.querySelector('[data-field="phone"]')?.value?.trim() || '',
            department: tr.querySelector('[data-field="department"]')?.value || '',
            active: tr.querySelector('[data-field="status"]')?.value === 'Activo'
        });
    });

    if (!rows.length) {
        showAlert('No hay datos para guardar', 'warning');
        return;
    }

    localStorage.setItem('leaf_employees', JSON.stringify(rows));
    showAlert(`${rows.length} empleado(s) guardado(s)`, 'success');
}


