
let nextDamagedId = 1;
let currentDamDate = todayISO();

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initDamaged();
});

function initDamaged() {
    const dateInput = document.getElementById('damDate');
    if (dateInput) {
        dateInput.value = currentDamDate;
        dateInput.addEventListener('change', () => {
            currentDamDate = dateInput.value || todayISO();
            loadDamaged();
        });
    }

    document.getElementById('btnToday')?.addEventListener('click', () => {
        currentDamDate = todayISO();
        const di = document.getElementById('damDate');
        if (di) di.value = currentDamDate;
        loadDamaged();
    });

    document.getElementById('btnRefresh')?.addEventListener('click', loadDamaged);
    document.getElementById('btnSave')?.addEventListener('click', saveDamaged);
    document.getElementById('btnAddRow')?.addEventListener('click', () => addRow(true));

    loadDamaged();
}

function loadDamaged() {
    const tbody = document.getElementById('damBody');
    if (!tbody) return;

    let allData = [];
    try {
        const stored = localStorage.getItem('leaf_damaged');
        if (stored) allData = JSON.parse(stored);
    } catch {
        allData = [];
    }

    // Deduplicate IDs across all data
    const seenIds = new Set();
    let needsReSave = false;
    for (const item of allData) {
        if (item.id == null || seenIds.has(item.id)) {
            needsReSave = true;
            while (seenIds.has(nextDamagedId)) nextDamagedId++;
            item.id = nextDamagedId++;
            seenIds.add(item.id);
        } else {
            seenIds.add(item.id);
            if (item.id >= nextDamagedId) nextDamagedId = item.id + 1;
        }
    }
    if (needsReSave) {
        localStorage.setItem('leaf_damaged', JSON.stringify(allData));
    }

    const data = allData.filter(item => item.date === currentDamDate);

    tbody.innerHTML = '';

    data.forEach(item => {
        const reviewed = item.reviewed === true;
        appendRow(tbody, item.id, item.reference || '', item.quantity || 1, reviewed, item.date || currentDamDate);
    });

    if (data.length === 0) {
        appendRow(tbody, nextDamagedId++, '', 1, false, currentDamDate);
    }

    bindRowEvents(tbody);
    updateSummary();
}

function appendRow(tbody, id, reference, quantity, reviewed, date) {
    const tr = document.createElement('tr');
    tr.dataset.id = id;
    tr.innerHTML = `
        <td>
            <input type="text" class="gen-input-text" value="${escapeHtml(reference)}" placeholder="REF-001" data-field="reference" style="max-width:140px" />
        </td>
        <td>
            <input type="number" class="gen-input-small" value="${quantity}" min="1" data-field="quantity" />
        </td>
        <td>
            <label class="dam-cb-label">
                <input type="checkbox" class="dam-cb" data-field="reviewed" ${reviewed ? 'checked' : ''} />
                <span>Revisado</span>
            </label>
        </td>
        <td>
            <input type="date" class="gen-input-text" style="max-width:150px" value="${date}" data-field="date" />
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

    tbody.querySelectorAll('[data-field="reference"]').forEach(inp => {
        if (inp.dataset.bound) return;
        inp.dataset.bound = '1';
        inp.addEventListener('input', function () {
            const tr = this.closest('tr');
            if (tr && isLastRow(tr)) {
                addRow(false);
            }
        });
    });

    tbody.querySelectorAll('[data-field="reviewed"]').forEach(cb => {
        if (cb.dataset.bound) return;
        cb.dataset.bound = '1';
        cb.addEventListener('change', updateSummary);
    });
}

function isLastRow(tr) {
    const tbody = tr.closest('tbody');
    if (!tbody) return false;
    const rows = tbody.querySelectorAll('tr');
    return rows.length > 0 && tr === rows[rows.length - 1];
}

function ensureLastRow() {
    const tbody = document.getElementById('damBody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
        appendRow(tbody, nextDamagedId++, '', 1, false, currentDamDate);
        bindRowEvents(tbody);
    }
    updateSummary();
}

function addRow(focus) {
    const tbody = document.getElementById('damBody');
    if (!tbody) return;
    appendRow(tbody, nextDamagedId++, '', 1, false, currentDamDate);
    bindRowEvents(tbody);
    updateSummary();
    if (focus) {
        const rows = tbody.querySelectorAll('tr');
        const last = rows[rows.length - 1];
        const inp = last?.querySelector('[data-field="reference"]');
        inp?.focus();
    }
}

function updateSummary() {
    const rows = document.querySelectorAll('#damBody tr');
    let total = 0;
    let pending = 0;
    let reviewed = 0;
    rows.forEach(tr => {
        const ref = tr.querySelector('[data-field="reference"]')?.value?.trim() || '';
        if (!ref) return;
        total++;
        const cb = tr.querySelector('[data-field="reviewed"]');
        if (cb && cb.checked) reviewed++;
        else pending++;
    });

    const el = id => document.getElementById(id);
    if (el('sumTotal')) el('sumTotal').textContent = total;
    if (el('sumPending')) el('sumPending').textContent = pending;
    if (el('sumReviewed')) el('sumReviewed').textContent = reviewed;
}

function saveDamaged() {
    let allData = [];
    try {
        const stored = localStorage.getItem('leaf_damaged');
        if (stored) allData = JSON.parse(stored);
    } catch {
        allData = [];
    }

    const rows = [];
    document.querySelectorAll('#damBody tr').forEach(tr => {
        const reference = tr.querySelector('[data-field="reference"]')?.value?.trim() || '';
        const quantity = parseInt(tr.querySelector('[data-field="quantity"]')?.value) || 0;
        if (!reference || quantity < 1) return;
        rows.push({
            id: parseInt(tr.dataset.id) || nextDamagedId++,
            reference,
            quantity,
            reviewed: tr.querySelector('[data-field="reviewed"]')?.checked || false,
            date: tr.querySelector('[data-field="date"]')?.value || currentDamDate
        });
    });

    if (!rows.length) {
        showAlert('No hay datos para guardar', 'warning');
        return;
    }

    allData = allData.filter(item => item.date !== currentDamDate);
    allData.push(...rows);
    localStorage.setItem('leaf_damaged', JSON.stringify(allData));

    showAlert(`${rows.length} registro(s) guardado(s)`, 'success');
}


