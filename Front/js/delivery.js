
const DEFAULT_ROWS = 1;
let nextId = 100;
let currentDate = todayISO();

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initDelivery();
});



/* ---------- Delivery Logic ---------- */

function initDelivery() {
    const dateInput = document.getElementById('delDate');
    if (dateInput) {
        dateInput.value = currentDate;
        dateInput.addEventListener('change', () => {
            currentDate = dateInput.value || todayISO();
            loadInvoices();
        });
    }

    document.getElementById('btnToday')?.addEventListener('click', () => {
        currentDate = todayISO();
        const di = document.getElementById('delDate');
        if (di) di.value = currentDate;
        loadInvoices();
    });

    document.getElementById('btnRefresh')?.addEventListener('click', loadInvoices);
    document.getElementById('btnSave')?.addEventListener('click', saveDeliveries);
    document.getElementById('btnAddRow')?.addEventListener('click', () => addRow(true));

    initDeliveryInfo();
    loadInvoices();
}

function initDeliveryInfo() {
    const persona = document.getElementById('delPersona');
    if (persona && !persona.value) {
        persona.value = localStorage.getItem('username') || '';
    }

    const deliveryDate = document.getElementById('delDeliveryDate');
    if (deliveryDate && !deliveryDate.value) {
        deliveryDate.value = todayISO();
    }
}

function loadInvoices() {
    const tbody = document.getElementById('delBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    for (let i = 0; i < DEFAULT_ROWS; i++) {
        appendRow(tbody, nextId++, '', 1);
    }

    bindRowQtyEvents(tbody);
    bindRowEvents(tbody);
    updateSummary();
}

function appendRow(tbody, id, customer, quantity) {
    const tr = document.createElement('tr');
    tr.dataset.id = id;
    tr.innerHTML = `
        <td>
            <input type="text" class="del-input-text del-input-customer" value="${escapeHtml(customer)}" placeholder="Nombre del cliente" />
        </td>
        <td>
            <input type="number" class="del-input-qty" value="${quantity}" min="1" />
        </td>
        <td class="del-col-actions">
            <button class="del-btn-icon del-btn-delete" title="Eliminar fila"><i class="ti ti-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
}

function bindRowQtyEvents(tbody) {
    tbody.querySelectorAll('.del-input-qty').forEach(inp => {
        inp.addEventListener('input', updateSummary);
    });
}

function bindRowEvents(tbody) {
    tbody.querySelectorAll('.del-btn-delete').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
            const tr = this.closest('tr');
            if (tr) tr.remove();
            updateSummary();
            ensureLastRow();
        });
    });

    tbody.querySelectorAll('.del-input-customer').forEach(inp => {
        if (inp.dataset.bound) return;
        inp.dataset.bound = '1';
        if (!inp.closest('.autocomplete-wrap')) {
            new Autocomplete(inp, {
                onSelect: () => {
                    const tr = inp.closest('tr');
                    if (tr && isLastRow(tr)) addRow(false);
                }
            });
        }
        inp.addEventListener('input', function () {
            const tr = this.closest('tr');
            if (tr && isLastRow(tr)) {
                addRow(false);
            }
        });
    });
}

function isLastRow(tr) {
    const tbody = tr.closest('tbody');
    if (!tbody) return false;
    const rows = tbody.querySelectorAll('tr[data-id]');
    return rows.length > 0 && tr === rows[rows.length - 1];
}

function ensureLastRow() {
    const tbody = document.getElementById('delBody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-id]');
    if (rows.length === 0) {
        appendRow(tbody, nextId++, '', 1);
        bindRowQtyEvents(tbody);
        bindRowEvents(tbody);
    } else {
        const last = rows[rows.length - 1];
        const inp = last.querySelector('.del-input-customer');
        if (inp && inp.value.trim() !== '') {
            addRow(false);
        }
    }
    updateSummary();
}

function addRow(focus) {
    const tbody = document.getElementById('delBody');
    if (!tbody) return;

    appendRow(tbody, nextId++, '', 1);
    bindRowQtyEvents(tbody);
    bindRowEvents(tbody);
    updateSummary();

    if (focus) {
        const rows = tbody.querySelectorAll('tr[data-id]');
        const last = rows[rows.length - 1];
        const inp = last?.querySelector('.del-input-customer');
        inp?.focus();
    }
}

function updateSummary() {
    const rows = document.querySelectorAll('#delBody tr[data-id]');
    let totalQty = 0;
    rows.forEach(tr => {
        totalQty += parseInt(tr.querySelector('.del-input-qty')?.value) || 0;
    });

    const el = id => document.getElementById(id);
    if (el('sumTotal')) el('sumTotal').textContent = totalQty;
}

function saveDeliveries() {
    const rows = [];
    document.querySelectorAll('#delBody tr[data-id]').forEach(tr => {
        const customer = tr.querySelector('.del-input-customer')?.value?.trim() || '';
        const quantity = parseInt(tr.querySelector('.del-input-qty')?.value) || 1;
        if (!customer) return;
        rows.push({ customer, quantity });
    });

    if (!rows.length) {
        showAlert('No hay datos para guardar', 'warning');
        return;
    }

    const info = {
        persona: document.getElementById('delPersona')?.value?.trim() || '',
        driver: document.getElementById('delDriver')?.value?.trim() || '',
        placa: document.getElementById('delPlaca')?.value?.trim() || '',
        time: document.getElementById('delTime')?.value || '',
        deliveryDate: document.getElementById('delDeliveryDate')?.value || ''
    };

    const planilla = {
        id: Date.now(),
        savedAt: new Date().toISOString(),
        date: currentDate,
        info,
        rows
    };

    savePlanillaLocal(planilla);
    document.querySelectorAll('.del-input-customer').forEach(inp => {
        const name = inp.value.trim();
        if (name) addCustomer(name);
    });
    showAlert(`${rows.length} factura(s) guardada(s)`, 'success');
}

function savePlanillaLocal(planilla) {
    let planillas = JSON.parse(localStorage.getItem('leaf_planillas') || '[]');
    planillas.unshift(planilla);
    localStorage.setItem('leaf_planillas', JSON.stringify(planillas));
}


