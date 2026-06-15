
document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    applyDashboardVisibility();
    loadStats();
    initBackup();
});

function applyDashboardVisibility() {
    const role = localStorage.getItem('role') || 'EMPLOYEE';
    const allowed = ROLES[role] || ROLES['EMPLOYEE'];

    document.querySelectorAll('[id^="card"], [id^="qa"]').forEach(el => {
        el.style.display = allowed.includes(el.id) ? '' : 'none';
    });
}

function loadStats() {
    const today = new Date().toISOString().split('T')[0];

    try {
        const emps = JSON.parse(localStorage.getItem('leaf_employees') || '[]');
        const active = emps.filter(e => e.active).length;
        setStat('statEmployees', active);
    } catch { setStat('statEmployees', '—'); }

    try {
        const attAll = JSON.parse(localStorage.getItem('leaf_attendance') || '{}');
        const todayAtt = attAll[today] || [];
        setStat('statAttendance', todayAtt.length);
    } catch { setStat('statAttendance', '—'); }

    try {
        const planillas = JSON.parse(localStorage.getItem('leaf_planillas') || '[]');
        const todayDel = planillas.filter(p => p.date === today);
        setStat('statDeliveries', todayDel.length);
    } catch { setStat('statDeliveries', '—'); }

    try {
        const allDam = JSON.parse(localStorage.getItem('leaf_damaged') || '[]');
        const todayDam = allDam.filter(d => d.date === today && d.damaged !== false);
        setStat('statDamaged', todayDam.length);
    } catch { setStat('statDamaged', '—'); }
}

function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/* ---------- Backup / Restore ---------- */

function initBackup() {
    const btnExport = document.getElementById('btnExport');
    const btnImport = document.getElementById('btnImport');
    const fileInput = document.getElementById('fileInput');
    if (!btnExport || !btnImport || !fileInput) return;

    btnExport.addEventListener('click', exportData);
    btnImport.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', importData);

    const btnCleanup = document.getElementById('btnCleanup');
    if (btnCleanup) {
        btnCleanup.addEventListener('click', function () {
            const months = parseInt(document.getElementById('cleanupMonths')?.value) || 3;
            openCleanupModal(months);
        });
    }

    /* ---------- Cleanup Modal ---------- */
    document.getElementById('cleanupModalClose')?.addEventListener('click', closeCleanupModal);
    document.getElementById('cleanupCancel')?.addEventListener('click', closeCleanupModal);
    document.getElementById('cleanupDelete')?.addEventListener('click', executeCleanupDelete);
    document.getElementById('cleanupSelectAll')?.addEventListener('change', function () {
        document.querySelectorAll('#cleanupBody .cleanup-cb').forEach(cb => cb.checked = this.checked);
        updateCleanupCount();
    });

    const cm = document.getElementById('cleanupModal');
    if (cm) {
        cm.addEventListener('click', function (e) {
            if (e.target === this) closeCleanupModal();
        });
    }
}

/* ---------- Cleanup Modal ---------- */

let cleanupPlanillas = [];

function openCleanupModal(months) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    try {
        cleanupPlanillas = JSON.parse(localStorage.getItem('leaf_planillas') || '[]');
    } catch {
        cleanupPlanillas = [];
    }

    const old = cleanupPlanillas.filter(p => p.date < cutoffStr);
    if (old.length === 0) {
        showAlert(`No hay planillas anteriores a ${months} mes(es)`, 'info');
        return;
    }

    document.getElementById('cleanupTitle').textContent = `Planillas anteriores a ${months} mes(es)`;
    document.getElementById('cleanupDesc').textContent = `Se encontraron ${old.length} planilla(s) anteriores a ${formatDate(cutoffStr)}. Desmarca las que quieras conservar.`;
    document.getElementById('cleanupSelectAll').checked = true;

    const tbody = document.getElementById('cleanupBody');
    tbody.innerHTML = '';
    old.forEach(p => {
        const tr = document.createElement('tr');
        const totalQty = p.rows?.reduce((s, r) => s + (r.quantity || 0), 0) || 0;
        tr.innerHTML = `
            <td><input type="checkbox" class="cleanup-cb" data-id="${p.id}" checked /></td>
            <td>${escapeHtml(formatDate(p.date))}</td>
            <td>${escapeHtml(p.info?.persona || '-')}</td>
            <td>${escapeHtml(p.info?.driver || '-')}</td>
            <td class="pln-cell-qty">${totalQty}</td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.cleanup-cb').forEach(cb => {
        cb.addEventListener('change', updateCleanupCount);
    });

    updateCleanupCount();
    document.getElementById('cleanupModal').style.display = '';
}

function updateCleanupCount() {
    const checked = document.querySelectorAll('#cleanupBody .cleanup-cb:checked').length;
    document.getElementById('cleanupCount').textContent = checked;
    const allCb = document.getElementById('cleanupSelectAll');
    const total = document.querySelectorAll('#cleanupBody .cleanup-cb').length;
    if (allCb) allCb.checked = checked > 0 && checked === total;
}

function closeCleanupModal() {
    document.getElementById('cleanupModal').style.display = 'none';
    cleanupPlanillas = [];
}

function executeCleanupDelete() {
    const checked = document.querySelectorAll('#cleanupBody .cleanup-cb:checked');
    if (checked.length === 0) {
        showAlert('No seleccionaste ninguna planilla', 'warning');
        return;
    }

    const ids = new Set();
    checked.forEach(cb => ids.add(parseInt(cb.dataset.id)));

    let planillas = [];
    try { planillas = JSON.parse(localStorage.getItem('leaf_planillas') || '[]'); } catch {}
    planillas = planillas.filter(p => !ids.has(p.id));
    localStorage.setItem('leaf_planillas', JSON.stringify(planillas));

    closeCleanupModal();
    showAlert(`${ids.size} planilla(s) eliminada(s)`, 'success');
}

function getDataKeys() {
    return ['leaf_employees', 'leaf_attendance', 'leaf_planillas', 'leaf_damaged', 'leaf_users'];
}

function exportData() {
    const data = {};
    getDataKeys().forEach(key => {
        try {
            const val = localStorage.getItem(key);
            if (val) data[key] = JSON.parse(val);
        } catch {}
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaf-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert('Datos exportados correctamente', 'success');
}

function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
        try {
            const data = JSON.parse(ev.target.result);
            const keys = getDataKeys();
            let count = 0;
            keys.forEach(key => {
                if (data[key] !== undefined) {
                    localStorage.setItem(key, JSON.stringify(data[key]));
                    count++;
                }
            });
            showAlert(`${count} módulo(s) importados. Recarga la página para ver los cambios.`, 'success');
            document.getElementById('fileInput').value = '';
        } catch {
            showAlert('El archivo no es válido', 'danger');
        }
    };
    reader.readAsText(file);
}
