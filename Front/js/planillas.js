
let allPlanillas = [];
let currentPlanilla = null;
const PAGE_SIZE = 15;
let currentPage = 1;
let pagStart = 0;

/* ---------- Store View State ---------- */
let storeIndex = {};
let selectedStore = '';
let storePage = 1;
const STORE_PAGE_SIZE = 20;

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initPlanillas();
});

function initPlanillas() {
    document.getElementById('btnFilter')?.addEventListener('click', () => { currentPage = 1; renderList(); });
    document.getElementById('btnClear')?.addEventListener('click', clearFilters);
    document.getElementById('btnRefresh')?.addEventListener('click', loadPlanillas);
    document.getElementById('btnBack')?.addEventListener('click', showList);
    document.getElementById('btnSaveDetail')?.addEventListener('click', saveDetail);
    document.getElementById('btnStoreClear')?.addEventListener('click', clearStoreFilter);
    document.getElementById('btnDeleteSelected')?.addEventListener('click', deleteSelected);
    document.getElementById('btnSelectAll')?.addEventListener('click', toggleSelectAll);
    document.getElementById('plnCheckAll')?.addEventListener('change', function () {
        document.querySelectorAll('#plnBody .pln-row-cb').forEach(cb => cb.checked = this.checked);
        updateBulkBar();
    });

    document.getElementById('filterCliente')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { currentPage = 1; renderList(); }
    });
    document.getElementById('filterConductor')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { currentPage = 1; renderList(); }
    });

    /* ---------- Tabs ---------- */
    document.querySelectorAll('.pln-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.pln-tab').forEach(t => t.classList.remove('pln-tab-active'));
            this.classList.add('pln-tab-active');
            const view = this.dataset.view;
            document.getElementById('plnListView').style.display = view === 'list' ? '' : 'none';
            document.getElementById('plnStoreView').style.display = view === 'store' ? '' : 'none';
            document.getElementById('plnDetailView').style.display = 'none';
            if (view === 'store') renderStoreView();
        });
    });

    /* ---------- Store Filter ---------- */
    const storeFilter = document.getElementById('storeFilter');
    if (storeFilter) {
        storeFilter.addEventListener('input', function () {
            renderStoreGrid(this.value);
        });
    }

    loadPlanillas();
}

function loadPlanillas() {
    try {
        allPlanillas = JSON.parse(localStorage.getItem('leaf_planillas') || '[]');
    } catch {
        allPlanillas = [];
    }
    showList();
}

/* ---------- List View ---------- */

function showList() {
    document.getElementById('plnListView').style.display = '';
    document.getElementById('plnDetailView').style.display = 'none';
    document.getElementById('plnStoreView').style.display = 'none';
    currentPlanilla = null;
    renderList();
}

function getFiltered() {
    const cliente = (document.getElementById('filterCliente')?.value || '').toLowerCase().trim();
    const fecha = document.getElementById('filterFecha')?.value || '';
    const conductor = (document.getElementById('filterConductor')?.value || '').toLowerCase().trim();

    return allPlanillas.filter(p => {
        if (fecha && p.date !== fecha) return false;
        if (conductor && (!p.info?.driver || !p.info.driver.toLowerCase().includes(conductor))) return false;
        if (cliente) {
            const match = p.rows?.some(r => r.customer?.toLowerCase().includes(cliente));
            if (!match) return false;
        }
        return true;
    });
}

function renderList() {
    const tbody = document.getElementById('plnBody');
    if (!tbody) return;

    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    pagStart = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(pagStart, pagStart + PAGE_SIZE);

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="gen-empty"><i class="ti ti-inbox"></i> No hay planillas guardadas</td></tr>`;
        updateSummary(filtered);
        renderPagination(filtered.length, totalPages);
        updateBulkBar();
        return;
    }

    pageItems.forEach(p => {
        const totalQty = p.rows?.reduce((s, r) => s + (r.quantity || 0), 0) || 0;
        const deliveredQty = p.rows?.reduce((s, r) => s + (r.delivered ? (r.quantity || 0) : 0), 0) || 0;
        const pendingQty = totalQty - deliveredQty;

        const tr = document.createElement('tr');
        tr.dataset.id = p.id;
        tr.className = 'pln-row';
        tr.innerHTML = `
            <td><input type="checkbox" class="pln-row-cb" data-id="${p.id}" /></td>
            <td><span class="pln-cell-date">${escapeHtml(formatDate(p.date))}</span></td>
            <td>${escapeHtml(p.info?.persona || '-')}</td>
            <td>${escapeHtml(p.info?.driver || '-')}</td>
            <td>${escapeHtml(p.info?.placa || '-')}</td>
            <td>${escapeHtml(p.info?.time ? p.info.time.substring(0, 5) : '-')}</td>
            <td>${p.info?.deliveryDate ? escapeHtml(formatDate(p.info.deliveryDate)) : '-'}</td>
            <td class="pln-cell-qty">${totalQty}</td>
            <td class="pln-cell-qty pln-cell-green">${deliveredQty}</td>
            <td class="pln-cell-qty ${pendingQty > 0 ? 'pln-cell-red' : ''}">${pendingQty}</td>
            <td class="gen-col-actions">
                <button class="gen-btn-icon gen-btn-delete pln-delete" title="Eliminar planilla"><i class="ti ti-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.pln-row').forEach(row => {
        row.addEventListener('dblclick', function () {
            const id = parseInt(this.dataset.id);
            const planilla = allPlanillas.find(p => p.id === id);
            if (planilla) showDetail(planilla);
        });
        row.style.cursor = 'pointer';
    });

    tbody.querySelectorAll('.pln-delete').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const tr = this.closest('tr');
            if (!tr) return;
            const id = parseInt(tr.dataset.id);
            allPlanillas = allPlanillas.filter(p => p.id !== id);
            localStorage.setItem('leaf_planillas', JSON.stringify(allPlanillas));
            renderList();
            showAlert('Planilla eliminada', 'success');
        });
    });

    tbody.querySelectorAll('.pln-row-cb').forEach(cb => {
        cb.addEventListener('change', updateBulkBar);
    });

    updateSummary(filtered);
    renderPagination(filtered.length, totalPages);
    updateBulkBar();
}

function renderPagination(total, totalPages) {
    let container = document.getElementById('plnPagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'plnPagination';
        container.className = 'pagination-controls';
        const wrap = document.querySelector('#plnListView .gen-table-wrap');
        if (wrap) wrap.after(container);
    }

    if (total === 0) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="page-btn" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}><i class="ti ti-chevron-left"></i></button>`;

    const maxVisible = 5;
    let startP = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endP = Math.min(totalPages, startP + maxVisible - 1);
    if (endP - startP + 1 < maxVisible) startP = Math.max(1, endP - maxVisible + 1);

    if (startP > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startP > 2) html += `<span class="page-info">...</span>`;
    }
    for (let p = startP; p <= endP; p++) {
        html += `<button class="page-btn ${p === currentPage ? 'page-active' : ''}" data-page="${p}">${p}</button>`;
    }
    if (endP < totalPages) {
        if (endP < totalPages - 1) html += `<span class="page-info">...</span>`;
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}><i class="ti ti-chevron-right"></i></button>`;
    html += `<span class="page-info">${pagStart + 1}-${Math.min(pagStart + PAGE_SIZE, total)} de ${total}</span>`;

    container.innerHTML = html;

    container.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.page;
            if (p === 'prev') currentPage--;
            else if (p === 'next') currentPage++;
            else currentPage = parseInt(p);
            renderList();
        });
    });
}

function updateSummary(filtered) {
    const total = filtered.length;
    let facturas = 0, entregados = 0, pendientes = 0;
    filtered.forEach(p => {
        const rows = p.rows || [];
        rows.forEach(r => {
            const q = r.quantity || 0;
            facturas += q;
            if (r.delivered) entregados += q;
            else pendientes += q;
        });
    });

    const el = id => document.getElementById(id);
    if (el('sumTotal')) el('sumTotal').textContent = total;
    if (el('sumFacturas')) el('sumFacturas').textContent = facturas;
    if (el('sumEntregados')) el('sumEntregados').textContent = entregados;
    if (el('sumPendientes')) el('sumPendientes').textContent = pendientes;
}

function clearFilters() {
    const fc = document.getElementById('filterCliente');
    const ff = document.getElementById('filterFecha');
    const fco = document.getElementById('filterConductor');
    if (fc) fc.value = '';
    if (ff) ff.value = '';
    if (fco) fco.value = '';
    currentPage = 1;
    renderList();
}

/* ---------- Detail View ---------- */

function showDetail(planilla) {
    currentPlanilla = planilla;
    document.getElementById('plnListView').style.display = 'none';
    document.getElementById('plnDetailView').style.display = '';

    document.getElementById('detFecha').textContent = formatDate(planilla.date);
    document.getElementById('detPersona').textContent = planilla.info?.persona || '-';
    document.getElementById('detConductor').textContent = planilla.info?.driver || '-';
    document.getElementById('detPlaca').textContent = planilla.info?.placa || '-';
    document.getElementById('detHora').textContent = planilla.info?.time ? planilla.info.time.substring(0, 5) : '-';
    document.getElementById('detFechaEntrega').textContent = planilla.info?.deliveryDate ? formatDate(planilla.info.deliveryDate) : '-';

    renderDetailRows(planilla.rows || []);
}

function renderDetailRows(rows) {
    const tbody = document.getElementById('plnDetailBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="gen-empty">Sin registros</td></tr>`;
        return;
    }

    rows.forEach((r, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="pln-cell-date">${escapeHtml(r.customer || '-')}</span></td>
            <td class="pln-cell-qty">${r.quantity || 0}</td>
            <td>
                <input type="checkbox" class="pln-detail-check" data-index="${i}" ${r.delivered ? 'checked' : ''} />
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.pln-detail-check').forEach(cb => {
        cb.addEventListener('change', function () {
            const idx = parseInt(this.dataset.index);
            if (currentPlanilla && currentPlanilla.rows && currentPlanilla.rows[idx]) {
                currentPlanilla.rows[idx].delivered = this.checked;
            }
        });
    });
}

function saveDetail() {
    if (!currentPlanilla) return;

    const idx = allPlanillas.findIndex(p => p.id === currentPlanilla.id);
    if (idx === -1) return;

    allPlanillas[idx] = currentPlanilla;
    localStorage.setItem('leaf_planillas', JSON.stringify(allPlanillas));
    showAlert('Cambios guardados correctamente', 'success');
}

/* ---------- Bulk Selection ---------- */

function updateBulkBar() {
    const checked = document.querySelectorAll('#plnBody .pln-row-cb:checked');
    const bar = document.getElementById('plnBulkBar');
    const count = document.getElementById('plnSelectedCount');
    if (!bar || !count) return;
    if (checked.length > 0) {
        bar.style.display = 'flex';
        count.textContent = checked.length;
    } else {
        bar.style.display = 'none';
        count.textContent = '0';
    }
    const allCb = document.getElementById('plnCheckAll');
    const total = document.querySelectorAll('#plnBody .pln-row-cb').length;
    if (allCb) allCb.checked = checked.length > 0 && checked.length === total;
}

function toggleSelectAll() {
    const allCb = document.getElementById('plnCheckAll');
    const allChecked = allCb?.checked;
    document.querySelectorAll('#plnBody .pln-row-cb').forEach(cb => cb.checked = allChecked);
    updateBulkBar();
}

function deleteSelected() {
    const checked = document.querySelectorAll('#plnBody .pln-row-cb:checked');
    if (checked.length === 0) return;
    if (!confirm(`¿Eliminar ${checked.length} planilla(s) seleccionada(s)? Esta acción no se puede deshacer.`)) return;

    const ids = new Set();
    checked.forEach(cb => ids.add(parseInt(cb.dataset.id)));
    allPlanillas = allPlanillas.filter(p => !ids.has(p.id));
    localStorage.setItem('leaf_planillas', JSON.stringify(allPlanillas));
    showAlert(`${ids.size} planilla(s) eliminada(s)`, 'success');
    renderList();
}

/* ---------- Store View ---------- */

function buildStoreIndex() {
    storeIndex = {};
    allPlanillas.forEach(p => {
        (p.rows || []).forEach(r => {
            const name = r.customer?.trim();
            if (!name) return;
            if (!storeIndex[name]) {
                storeIndex[name] = { planillaIds: new Set(), totalQty: 0, deliveredQty: 0, pendingQty: 0 };
            }
            storeIndex[name].planillaIds.add(p.id);
            const q = r.quantity || 0;
            storeIndex[name].totalQty += q;
            if (r.delivered) {
                storeIndex[name].deliveredQty += q;
            } else {
                storeIndex[name].pendingQty += q;
            }
        });
    });
    Object.keys(storeIndex).forEach(k => {
        storeIndex[k].planillaCount = storeIndex[k].planillaIds.size;
        delete storeIndex[k].planillaIds;
    });
}

function renderStoreView() {
    buildStoreIndex();
    const filter = (document.getElementById('storeFilter')?.value || '').trim().toLowerCase();
    renderStoreGrid(filter);
}

function renderStoreGrid(filter) {
    const grid = document.getElementById('storeGrid');
    const summary = document.getElementById('storeSummary');
    const tableWrap = document.getElementById('storeTableWrap');
    if (!grid) return;

    if (selectedStore) {
        renderStoreHistory(selectedStore);
        return;
    }

    summary.style.display = 'none';
    tableWrap.style.display = 'none';

    let names = Object.keys(storeIndex);
    if (filter) {
        const q = filter.toLowerCase();
        names = names.filter(n => n.toLowerCase().includes(q));
    }
    names.sort();

    if (names.length === 0) {
        grid.innerHTML = `<div class="gen-empty" style="grid-column:1/-1;padding:2rem"><i class="ti ti-inbox"></i> No hay tiendas</div>`;
        return;
    }

    grid.style.display = 'grid';
    let html = '';
    names.forEach(name => {
        const s = storeIndex[name];
        html += `
            <div class="pln-store-card" data-store="${escapeHtml(name)}">
                <div class="pln-store-card-name">${escapeHtml(name)}</div>
                <div class="pln-store-card-stats">
                    <span><i class="ti ti-file-spreadsheet"></i> ${s.planillaCount} planillas</span>
                    <span><i class="ti ti-box"></i> ${s.totalQty}uds</span>
                    <span class="pln-cell-green"><i class="ti ti-circle-check"></i> ${s.deliveredQty}</span>
                    <span class="${s.pendingQty > 0 ? 'pln-cell-red' : ''}"><i class="ti ti-circle-x"></i> ${s.pendingQty}</span>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;

    grid.querySelectorAll('.pln-store-card').forEach(card => {
        card.addEventListener('click', function () {
            selectedStore = this.dataset.store;
            storePage = 1;
            renderStoreGrid();
        });
    });
}

function renderStoreHistory(storeName) {
    const grid = document.getElementById('storeGrid');
    const summary = document.getElementById('storeSummary');
    const tableWrap = document.getElementById('storeTableWrap');
    const tbody = document.getElementById('storeBody');
    const nameDisplay = document.getElementById('storeNameDisplay');
    if (!tbody) return;

    grid.style.display = 'none';

    nameDisplay.style.display = 'inline';
    nameDisplay.textContent = storeName;

    const records = [];
    allPlanillas.forEach(p => {
        (p.rows || []).forEach(r => {
            if ((r.customer || '').trim().toLowerCase() !== storeName.toLowerCase()) return;
            records.push({
                date: p.date,
                driver: p.info?.driver || '-',
                persona: p.info?.persona || '-',
                customer: r.customer,
                quantity: r.quantity || 0,
                delivered: r.delivered === true
            });
        });
    });

    records.sort((a, b) => b.date.localeCompare(a.date));

    const s = storeIndex[storeName] || { totalQty: 0, deliveredQty: 0, pendingQty: 0, planillaCount: 0 };
    document.getElementById('storeSumPlanillas').textContent = s.planillaCount || records.length;
    document.getElementById('storeSumFacturas').textContent = s.totalQty;
    document.getElementById('storeSumEntregados').textContent = s.deliveredQty;
    document.getElementById('storeSumPendientes').textContent = s.pendingQty;
    summary.style.display = 'flex';

    const totalPages = Math.max(1, Math.ceil(records.length / STORE_PAGE_SIZE));
    if (storePage > totalPages) storePage = totalPages;
    const start = (storePage - 1) * STORE_PAGE_SIZE;
    const pageItems = records.slice(start, start + STORE_PAGE_SIZE);

    tableWrap.style.display = '';

    tbody.innerHTML = '';
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="gen-empty">Sin registros</td></tr>`;
        renderStorePagination(records.length, totalPages);
        return;
    }

    pageItems.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(formatDate(r.date))}</td>
            <td>${escapeHtml(r.driver)}</td>
            <td>${escapeHtml(r.persona)}</td>
            <td>${escapeHtml(r.customer || '-')}</td>
            <td class="pln-cell-qty">${r.quantity}</td>
            <td class="pln-cell-qty ${r.delivered ? 'pln-cell-green' : 'pln-cell-red'}">${r.delivered ? 'Sí' : 'No'}</td>
        `;
        tbody.appendChild(tr);
    });

    renderStorePagination(records.length, totalPages);
}

function renderStorePagination(total, totalPages) {
    const storeStart = (storePage - 1) * STORE_PAGE_SIZE;
    let container = document.getElementById('storePagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'storePagination';
        container.className = 'pagination-controls';
        const wrap = document.getElementById('storeTableWrap');
        if (wrap) wrap.after(container);
    }

    if (total === 0) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="page-btn" data-page="prev" ${storePage <= 1 ? 'disabled' : ''}><i class="ti ti-chevron-left"></i></button>`;

    const maxVisible = 5;
    let startP = Math.max(1, storePage - Math.floor(maxVisible / 2));
    let endP = Math.min(totalPages, startP + maxVisible - 1);
    if (endP - startP + 1 < maxVisible) startP = Math.max(1, endP - maxVisible + 1);

    if (startP > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startP > 2) html += `<span class="page-info">...</span>`;
    }
    for (let p = startP; p <= endP; p++) {
        html += `<button class="page-btn ${p === storePage ? 'page-active' : ''}" data-page="${p}">${p}</button>`;
    }
    if (endP < totalPages) {
        if (endP < totalPages - 1) html += `<span class="page-info">...</span>`;
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" data-page="next" ${storePage >= totalPages ? 'disabled' : ''}><i class="ti ti-chevron-right"></i></button>`;
    html += `<span class="page-info">${storeStart + 1}-${Math.min(storeStart + STORE_PAGE_SIZE, total)} de ${total}</span>`;

    container.innerHTML = html;

    container.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.page;
            if (p === 'prev') storePage--;
            else if (p === 'next') storePage++;
            else storePage = parseInt(p);
            renderStoreHistory(selectedStore);
        });
    });
}

function clearStoreFilter() {
    selectedStore = '';
    storePage = 1;
    document.getElementById('storeFilter').value = '';
    document.getElementById('storeNameDisplay').style.display = 'none';
    document.getElementById('storeSummary').style.display = 'none';
    document.getElementById('storeTableWrap').style.display = 'none';
    renderStoreGrid('');
}
