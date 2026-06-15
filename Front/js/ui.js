function showLoading(container) {
    if (!container) return;
    container.innerHTML = `<tr><td colspan="10" class="gen-empty"><div class="loader-spinner"></div><span style="margin-top:0.5rem">Cargando...</span></td></tr>`;
}

function showError(container, message) {
    if (!container) return;
    container.innerHTML = `<tr><td colspan="10" class="gen-empty" style="color:var(--danger)"><i class="ti ti-alert-circle"></i> ${escapeHtml(message || 'Error al cargar los datos')}</td></tr>`;
}

function showEmpty(container, message) {
    if (!container) return;
    container.innerHTML = `<tr><td colspan="10" class="gen-empty"><i class="ti ti-inbox"></i> ${escapeHtml(message || 'No hay datos')}</td></tr>`;
}

async function handleApiCall(promise, container, onSuccess) {
    showLoading(container);
    try {
        const result = await promise;
        if (onSuccess) await onSuccess(result);
    } catch (err) {
        showError(container, err.message);
    }
}
