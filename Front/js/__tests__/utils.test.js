/* ---------- Pure functions (extracted from app.js) ---------- */

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]?.toUpperCase() || '').join('').substring(0, 2) || 'US';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

/* ---------- Tests ---------- */

describe('escapeHtml', () => {
    test('escapes & < > " and \'', () => {
        expect(escapeHtml('<script>alert("xss")</script>'))
            .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
    test('escapes single quotes', () => {
        expect(escapeHtml("O'Brien")).toBe('O&#39;Brien');
    });
    test('returns empty string for null/undefined', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml('')).toBe('');
    });
    test('returns safe string unchanged', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World');
    });
});

describe('getInitials', () => {
    test('returns first two initials', () => {
        expect(getInitials('John Doe')).toBe('JD');
    });
    test('returns single initial for one word', () => {
        expect(getInitials('Admin')).toBe('A');
    });
    test('returns US for empty string', () => {
        expect(getInitials('')).toBe('US');
    });
    test('handles multiple spaces', () => {
        expect(getInitials('  Juan  Carlos  ')).toBe('JC');
    });
});

describe('formatDate', () => {
    test('formats ISO date to es-ES locale', () => {
        const result = formatDate('2026-06-10');
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
    test('returns dash for null/empty', () => {
        expect(formatDate(null)).toBe('-');
        expect(formatDate('')).toBe('-');
    });
});

describe('calcHours', () => {
    test('normal 8h day minus 30min break = 7.5h', () => {
        expect(calcHours('08:00', '16:00')).toBe(7.5);
    });
    test('9h day minus 30min break = 8.5h', () => {
        expect(calcHours('08:00', '17:00')).toBe(8.5);
    });
    test('partial minutes: 08:30 to 17:15 = 8.25h', () => {
        expect(calcHours('08:30', '17:15')).toBe(8.25);
    });
    test('crosses midnight', () => {
        expect(calcHours('22:00', '06:00')).toBe(7.5);
    });
    test('returns null if entry or exit missing', () => {
        expect(calcHours('', '17:00')).toBeNull();
        expect(calcHours('08:00', null)).toBeNull();
        expect(calcHours('—', '17:00')).toBeNull();
    });
    test('returns null for invalid time format', () => {
        expect(calcHours('abc', '17:00')).toBeNull();
    });
});
