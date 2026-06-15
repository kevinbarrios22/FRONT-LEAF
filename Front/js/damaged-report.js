
let allItems = [];
let currentMonth = '';
const DAM_PAGE_SIZE = 20;
let damCurrentPage = 1;
let damPagStart = 0;

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initReport();
});

function initReport() {
    const monthInput = document.getElementById('repMonth');
    if (monthInput) {
        currentMonth = todayISO().substring(0, 7);
        monthInput.value = currentMonth;
        monthInput.addEventListener('change', () => {
            currentMonth = monthInput.value || todayISO().substring(0, 7);
            damCurrentPage = 1;
            renderReport();
        });
    }

    document.getElementById('btnFilter')?.addEventListener('click', () => { damCurrentPage = 1; renderReport(); });
    document.getElementById('btnClear')?.addEventListener('click', clearFilters);
    document.getElementById('btnRefresh')?.addEventListener('click', loadAndRender);

    document.getElementById('filterReference')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { damCurrentPage = 1; renderReport(); }
    });

    loadAndRender();
}

function loadAndRender() {
    loadData();
    renderReport();
}

function loadData() {
    try {
        const stored = localStorage.getItem('leaf_damaged');
        allItems = stored ? JSON.parse(stored) : [];
    } catch {
        allItems = [];
    }
}

function getFiltered() {
    const reference = (document.getElementById('filterReference')?.value || '').toLowerCase().trim();

    return allItems.filter(item => {
        if (currentMonth && !item.date?.startsWith(currentMonth)) return false;
        if (reference && !(item.reference || '').toLowerCase().includes(reference)) return false;
        return true;
    });
}

function renderReport() {
    const tbody = document.getElementById('repBody');
    if (!tbody) return;

    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / DAM_PAGE_SIZE));
    if (damCurrentPage > totalPages) damCurrentPage = totalPages;
    damPagStart = (damCurrentPage - 1) * DAM_PAGE_SIZE;
    const pageItems = filtered.slice(damPagStart, damPagStart + DAM_PAGE_SIZE);

    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="gen-empty"><i class="ti ti-inbox"></i> No se encontraron artículos</td></tr>`;
        updateSummary(filtered);
        renderDamPagination(filtered.length, totalPages);
        return;
    }

    pageItems.forEach(item => {
        const tr = document.createElement('tr');
        const reviewed = item.reviewed === true;
        const statusCls = reviewed ? 'pln-cell-green' : 'pln-cell-red';
        const statusLabel = reviewed ? 'Revisado' : 'Pendiente';
        tr.innerHTML = `
            <td>${escapeHtml(formatDate(item.date))}</td>
            <td>${escapeHtml(item.reference || '—')}</td>
            <td class="pln-cell-qty">${item.quantity || 0}</td>
            <td class="${statusCls}" style="font-weight:600">${statusLabel}</td>
        `;
        tbody.appendChild(tr);
    });

    updateSummary(filtered);
    renderDamPagination(filtered.length, totalPages);
}

function renderDamPagination(total, totalPages) {
    let container = document.getElementById('damPagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'damPagination';
        container.className = 'pagination-controls';
        const wrap = document.querySelector('.gen-table-wrap');
        if (wrap) wrap.after(container);
    }

    if (total === 0) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="page-btn" data-page="prev" ${damCurrentPage <= 1 ? 'disabled' : ''}><i class="ti ti-chevron-left"></i></button>`;

    const maxVisible = 5;
    let startP = Math.max(1, damCurrentPage - Math.floor(maxVisible / 2));
    let endP = Math.min(totalPages, startP + maxVisible - 1);
    if (endP - startP + 1 < maxVisible) startP = Math.max(1, endP - maxVisible + 1);

    if (startP > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startP > 2) html += `<span class="page-info">...</span>`;
    }
    for (let p = startP; p <= endP; p++) {
        html += `<button class="page-btn ${p === damCurrentPage ? 'page-active' : ''}" data-page="${p}">${p}</button>`;
    }
    if (endP < totalPages) {
        if (endP < totalPages - 1) html += `<span class="page-info">...</span>`;
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" data-page="next" ${damCurrentPage >= totalPages ? 'disabled' : ''}><i class="ti ti-chevron-right"></i></button>`;
    html += `<span class="page-info">${damPagStart + 1}-${Math.min(damPagStart + DAM_PAGE_SIZE, total)} de ${total}</span>`;

    container.innerHTML = html;

    container.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.page;
            if (p === 'prev') damCurrentPage--;
            else if (p === 'next') damCurrentPage++;
            else damCurrentPage = parseInt(p);
            renderReport();
        });
    });
}

function updateSummary(filtered) {
    const total = filtered.length;
    let quantity = 0, pending = 0, reviewed = 0;
    filtered.forEach(item => {
        quantity += item.quantity || 0;
        if (item.reviewed === true) reviewed++;
        else pending++;
    });

    const el = id => document.getElementById(id);
    if (el('sumItems')) el('sumItems').textContent = total;
    if (el('sumQuantity')) el('sumQuantity').textContent = quantity;
    if (el('sumPending')) el('sumPending').textContent = pending;
    if (el('sumReviewed')) el('sumReviewed').textContent = reviewed;
}

function clearFilters() {
    const ref = document.getElementById('filterReference');
    if (ref) ref.value = '';
    damCurrentPage = 1;
    renderReport();
}


