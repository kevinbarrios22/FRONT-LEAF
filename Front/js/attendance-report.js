
const STATUS_MAP = {
    '': { label: 'Sin registro', cls: 'rep-cell-sr', short: '—' },
    trabajando: { label: 'Trabajando', cls: 'rep-cell-tr', short: 'T' },
    descanso: { label: 'Descanso', cls: 'rep-cell-ds', short: 'D' },
    incapacidad: { label: 'Incapacidad', cls: 'rep-cell-in', short: 'I' },
    festivo: { label: 'Festivo', cls: 'rep-cell-fe', short: 'F' }
};

let employees = [];
let attendanceAll = {};
let currentMonth = '';
let currentDays = [];

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initReport();
    initModal();
});





function initReport() {
    const monthInput = document.getElementById('repMonth');
    if (monthInput) {
        currentMonth = todayISO().substring(0, 7);
        monthInput.value = currentMonth;
        monthInput.addEventListener('change', () => {
            currentMonth = monthInput.value || todayISO().substring(0, 7);
            loadReport();
        });
    }

    document.getElementById('btnToday')?.addEventListener('click', () => {
        currentMonth = todayISO().substring(0, 7);
        if (monthInput) monthInput.value = currentMonth;
        loadReport();
    });

    document.getElementById('btnRefresh')?.addEventListener('click', loadReport);

    loadReport();
}

function loadReport() {
    loadEmployees();
    loadAttendanceData();
    renderReport();
}

function loadEmployees() {
    let data = [];
    try {
        const stored = localStorage.getItem('leaf_employees');
        if (stored) data = JSON.parse(stored);
    } catch {
        data = [];
    }

    employees = data.filter(e => e.active).map(e => ({ id: e.id, name: e.name }));
}

function loadAttendanceData() {
    try {
        attendanceAll = JSON.parse(localStorage.getItem('leaf_attendance') || '{}');
    } catch {
        attendanceAll = {};
    }
}

function renderReport() {
    if (!currentMonth) return;

    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentMonth}-${String(d).padStart(2, '0')}`;
        const dayRecords = attendanceAll[dateStr] || [];
        days.push({ day: d, date: dateStr, records: dayRecords });
    }

    currentDays = days;
    renderTable(days, daysInMonth);
    updateSummary(days);
}

function renderTable(days, totalDays) {
    const thead = document.getElementById('repHead');
    const tbody = document.getElementById('repBody');
    if (!thead || !tbody) return;

    const dayCols = days.map(d => `<th class="rep-col-day">${d.day}</th>`).join('');

    thead.innerHTML = `<tr><th class="rep-col-name">Empleado</th><th class="rep-col-total">Total</th>${dayCols}</tr>`;

    if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${2 + totalDays}" class="gen-empty"><i class="ti ti-users"></i> No hay empleados</td></tr>`;
        return;
    }

    let totalTrabajando = 0, totalDescanso = 0, totalIncapacidad = 0, totalFestivo = 0, totalSinRegistro = 0;

    let html = '';
    employees.forEach(emp => {
        let empTrabajando = 0, empDescanso = 0, empIncapacidad = 0, empFestivo = 0, empSinRegistro = 0;

        let cells = '';
        days.forEach(d => {
            const rec = d.records.find(r => r.employeeId === emp.id);
            const status = rec?.status || '';
            const info = STATUS_MAP[status] || STATUS_MAP[''];

            cells += `<td class="rep-cell ${info.cls}" title="${emp.name} - Día ${d.day}: ${info.label}">${info.short}</td>`;

            if (status === 'trabajando') empTrabajando++;
            else if (status === 'descanso') empDescanso++;
            else if (status === 'incapacidad') empIncapacidad++;
            else if (status === 'festivo') empFestivo++;
            else empSinRegistro++;
        });

        const empTotal = days.length;

        totalTrabajando += empTrabajando;
        totalDescanso += empDescanso;
        totalIncapacidad += empIncapacidad;
        totalFestivo += empFestivo;
        totalSinRegistro += empSinRegistro;

        html += `<tr><td class="rep-cell-name rep-cell-clickable" data-emp-id="${emp.id}">${escapeHtml(emp.name)}</td><td class="rep-cell-total">${empTotal}</td>${cells}</tr>`;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll('.rep-cell-clickable').forEach(td => {
        td.addEventListener('click', function () {
            const empId = parseInt(this.dataset.empId);
            const emp = employees.find(e => e.id === empId);
            if (emp) showEmployeeDetail(emp);
        });
    });
}

function updateSummary(days) {
    const el = id => document.getElementById(id);
    const empCount = employees.length;
    const dayCount = days.length;

    if (el('sumEmployees')) el('sumEmployees').textContent = empCount;
    if (el('sumDays')) el('sumDays').textContent = dayCount;

    let trabajando = 0, descanso = 0, incapacidad = 0, festivo = 0, sinRegistro = 0;

    days.forEach(d => {
        d.records.forEach(r => {
            if (r.status === 'trabajando') trabajando++;
            else if (r.status === 'descanso') descanso++;
            else if (r.status === 'incapacidad') incapacidad++;
            else if (r.status === 'festivo') festivo++;
            else sinRegistro++;
        });
    });

    const totalRegistros = empCount * dayCount;
    sinRegistro = totalRegistros - trabajando - descanso - incapacidad - festivo;

    if (el('sumTrabajando')) el('sumTrabajando').textContent = trabajando;
    if (el('sumDescanso')) el('sumDescanso').textContent = descanso;
    if (el('sumIncapacidad')) el('sumIncapacidad').textContent = incapacidad;
    if (el('sumFestivo')) el('sumFestivo').textContent = festivo;
    if (el('sumSinRegistro')) el('sumSinRegistro').textContent = sinRegistro;
}

function calcHours(entry, exit) {
    if (!entry || !exit || entry === '—' || exit === '—') return null;
    const [eh, em] = entry.split(':').map(Number);
    const [xh, xm] = exit.split(':').map(Number);
    if (isNaN(eh) || isNaN(em) || isNaN(xh) || isNaN(xm)) return null;
    let minutes = (xh * 60 + xm) - (eh * 60 + em);
    if (minutes < 0) minutes += 1440;
    minutes = Math.max(0, minutes - 30);
    return Math.round(minutes / 60 * 100) / 100;
}

function showEmployeeDetail(emp) {
    document.getElementById('modalEmpName').textContent = emp.name;

    const tbody = document.getElementById('modalBody');
    if (!tbody) return;

    let trabajando = 0, descanso = 0, incapacidad = 0, festivo = 0, sinRegistro = 0;
    let totalHours = 0;
    let html = '';

    currentDays.forEach(d => {
        const rec = d.records.find(r => r.employeeId === emp.id);
        const status = rec?.status || '';
        const info = STATUS_MAP[status] || STATUS_MAP[''];
        const entry = rec?.entryTime || '—';
        const exit = rec?.exitTime || '—';
        const fecha = new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        const hours = calcHours(entry, exit);
        if (hours !== null) totalHours += hours;

        const breakMin = (hours !== null) ? 30 : '—';
        html += `<tr>
            <td>${d.day}</td>
            <td>${fecha}</td>
            <td><span class="rep-badge ${info.cls}">${info.label}</span></td>
            <td>${entry}</td>
            <td>${exit}</td>
            <td class="rep-cell-break">${breakMin}${breakMin !== '—' ? ' min' : ''}</td>
            <td class="rep-cell-qty">${hours !== null ? hours.toFixed(1) : '—'}</td>
        </tr>`;

        if (status === 'trabajando') trabajando++;
        else if (status === 'descanso') descanso++;
        else if (status === 'incapacidad') incapacidad++;
        else if (status === 'festivo') festivo++;
        else sinRegistro++;
    });

    tbody.innerHTML = html;

    document.getElementById('modalSummary').innerHTML = `
        <span class="rep-modal-stat"><span class="rep-dot rep-dot-trabajando"></span> ${trabajando}</span>
        <span class="rep-modal-stat"><span class="rep-dot rep-dot-descanso"></span> ${descanso}</span>
        <span class="rep-modal-stat"><span class="rep-dot rep-dot-incapacidad"></span> ${incapacidad}</span>
        <span class="rep-modal-stat"><span class="rep-dot rep-dot-festivo"></span> ${festivo}</span>
        <span class="rep-modal-stat"><span class="rep-dot rep-dot-sinregistro"></span> ${sinRegistro}</span>
        <span class="rep-modal-stat rep-modal-stat-total"><span class="rep-dot" style="background:var(--primary)"></span> ${totalHours.toFixed(1)}h</span>
    `;

    document.getElementById('repModal').style.display = '';
}

function initModal() {
    const modal = document.getElementById('repModal');
    if (!modal) return;

    document.getElementById('modalClose')?.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', function (e) {
        if (e.target === this) this.style.display = 'none';
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display !== 'none') modal.style.display = 'none';
    });
}


