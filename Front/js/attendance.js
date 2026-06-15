
document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initAttendance();
});





/* ---------- Attendance Logic ---------- */

const STATUS_OPTIONS = [
    { value: '', label: 'Sin registro', color: '' },
    { value: 'trabajando', label: 'Trabajando', color: 'green' },
    { value: 'descanso', label: 'Descanso', color: 'blue' },
    { value: 'incapacidad', label: 'Incapacidad', color: 'amber' },
    { value: 'festivo', label: 'Festivo', color: 'red' }
];

let employees = [];
let attendanceData = [];
let currentDate = todayISO();



function initAttendance() {
    const dateInput = document.getElementById('attDate');
    if (dateInput) {
        dateInput.value = currentDate;
        dateInput.addEventListener('change', () => {
            currentDate = dateInput.value || todayISO();
            loadAttendance();
        });
    }

    document.getElementById('btnToday')?.addEventListener('click', () => {
        currentDate = todayISO();
        if (dateInput) dateInput.value = currentDate;
        loadAttendance();
    });

    document.getElementById('btnRefresh')?.addEventListener('click', () => {
        loadAttendance();
    });

    document.getElementById('btnSave')?.addEventListener('click', () => {
        saveAttendance();
    });

    loadEmployees();
}

function loadEmployees() {
    const tbody = document.getElementById('attBody');
    if (!tbody) return;

    let data = [];
    try {
        const stored = localStorage.getItem('leaf_employees');
        if (stored) data = JSON.parse(stored);
    } catch {
        data = [];
    }

    employees = data.filter(e => e.active).map(e => ({ id: e.id, name: e.name, active: e.active }));

    loadAttendance();
}

function loadAttendance() {
    const tbody = document.getElementById('attBody');
    if (!tbody) return;

    if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="att-empty"><i class="ti ti-users"></i> No hay empleados activos</td></tr>`;
        updateSummary();
        return;
    }

    const all = JSON.parse(localStorage.getItem('leaf_attendance') || '{}');
    attendanceData = all[currentDate] || [];

    renderTable(tbody);
    updateSummary();
}

function renderTable(tbody) {
    const rows = employees.map(emp => {
        const record = attendanceData.find(r => r.employeeId === emp.id) || {};
        const status = record.status || '';

        return `
            <tr data-employee-id="${emp.id}">
                <td>
                    <div class="att-employee-cell">
                        <div class="att-employee-avatar">${getInitials(emp.name)}</div>
                        <span class="att-employee-name">${emp.name}</span>
                    </div>
                </td>
                <td>
                    <input type="date" class="att-input-date" value="${record.date || currentDate}" data-field="date" />
                </td>
                <td>
                    <input type="time" class="att-input-time" value="${record.entryTime || ''}" data-field="entryTime" placeholder="--:--" />
                </td>
                <td>
                    <input type="time" class="att-input-time" value="${record.exitTime || ''}" data-field="exitTime" placeholder="--:--" />
                </td>
                <td>
                    <select class="att-select ${getStatusClass(status)}" data-field="status">
                        ${STATUS_OPTIONS.map(opt => `
                            <option value="${opt.value}" ${status === opt.value ? 'selected' : ''}>${opt.label}</option>
                        `).join('')}
                    </select>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;

    tbody.querySelectorAll('.att-select').forEach(select => {
        select.addEventListener('change', () => {
            const val = select.value;
            select.className = `att-select ${getStatusClass(val)}`;
            updateSummary();
        });
    });
}

function getStatusClass(status) {
    switch (status) {
        case 'trabajando': return 'att-select-trabajando';
        case 'descanso': return 'att-select-descanso';
        case 'incapacidad': return 'att-select-incapacidad';
        case 'festivo': return 'att-select-festivo';
        default: return '';
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'trabajando': return 'green';
        case 'descanso': return 'blue';
        case 'incapacidad': return 'amber';
        case 'festivo': return 'red';
        default: return 'gray';
    }
}

function updateSummary() {
    let total = employees.length;
    let counts = { trabajando: 0, descanso: 0, incapacidad: 0, festivo: 0, pending: 0 };

    document.querySelectorAll('#attBody tr[data-employee-id]').forEach(row => {
        const select = row.querySelector('.att-select');
        if (select) {
            const val = select.value;
            if (val && counts[val] !== undefined) {
                counts[val]++;
            } else {
                counts.pending++;
            }
        }
    });

    const sumTotal = document.getElementById('sumTotal');
    if (sumTotal) sumTotal.textContent = total;

    const sumWorking = document.getElementById('sumWorking');
    if (sumWorking) sumWorking.textContent = counts.trabajando;

    const sumRest = document.getElementById('sumRest');
    if (sumRest) sumRest.textContent = counts.descanso;

    const sumIncapacity = document.getElementById('sumIncapacity');
    if (sumIncapacity) sumIncapacity.textContent = counts.incapacidad;

    const sumHoliday = document.getElementById('sumHoliday');
    if (sumHoliday) sumHoliday.textContent = counts.festivo;

    const sumPending = document.getElementById('sumPending');
    if (sumPending) sumPending.textContent = employees.length - counts.trabajando - counts.descanso - counts.incapacidad - counts.festivo;
}

function saveAttendance() {
    const rows = document.querySelectorAll('#attBody tr[data-employee-id]');
    const data = [];

    rows.forEach(row => {
        const employeeId = parseInt(row.dataset.employeeId);
        const date = row.querySelector('[data-field="date"]')?.value || currentDate;
        const entryTime = row.querySelector('[data-field="entryTime"]')?.value || '';
        const exitTime = row.querySelector('[data-field="exitTime"]')?.value || '';
        const status = row.querySelector('[data-field="status"]')?.value || '';

        data.push({ employeeId, date, entryTime, exitTime, status });
    });

    const all = JSON.parse(localStorage.getItem('leaf_attendance') || '{}');
    all[currentDate] = data;
    localStorage.setItem('leaf_attendance', JSON.stringify(all));

    showAlert('Asistencia guardada correctamente', 'success');
}






