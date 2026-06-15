/* ---------- Cleanup logic (extracted from app.js) ---------- */

function cleanupOldPlanillas(months, planillas) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const before = planillas.length;
    planillas = planillas.filter(p => p.date >= cutoffStr);
    return { removed: before - planillas.length, remaining: planillas };
}

/* ---------- Store index (extracted from planillas.js) ---------- */

function buildStoreIndex(items) {
    const index = {};
    items.forEach(p => {
        (p.rows || []).forEach(r => {
            const name = r.customer?.trim();
            if (!name) return;
            if (!index[name]) {
                index[name] = { planillaCount: 0, totalQty: 0, deliveredQty: 0, pendingQty: 0 };
            }
            index[name].planillaCount++;
            const q = r.quantity || 0;
            index[name].totalQty += q;
            if (r.delivered) {
                index[name].deliveredQty += q;
            } else {
                index[name].pendingQty += q;
            }
        });
    });
    return index;
}

/* ---------- Tests ---------- */

describe('cleanupOldPlanillas', () => {
    const baseDate = '2026-06-10';

    test('removes planillas older than 3 months', () => {
        const planillas = [
            { id: 1, date: '2025-01-15' },
            { id: 2, date: '2026-05-01' },
            { id: 3, date: '2026-06-10' },
        ];
        const result = cleanupOldPlanillas(3, planillas);
        expect(result.removed).toBe(1);
        expect(result.remaining.map(p => p.id)).toEqual([2, 3]);
    });

    test('removes nothing if all are recent', () => {
        const planillas = [
            { id: 1, date: '2026-05-01' },
            { id: 2, date: '2026-06-10' },
        ];
        const result = cleanupOldPlanillas(3, planillas);
        expect(result.removed).toBe(0);
        expect(result.remaining.length).toBe(2);
    });

    test('empty array returns removed 0', () => {
        const result = cleanupOldPlanillas(3, []);
        expect(result.removed).toBe(0);
        expect(result.remaining).toEqual([]);
    });
});

describe('buildStoreIndex', () => {
    test('groups planillas by customer name', () => {
        const planillas = [
            { id: 1, rows: [{ customer: 'Tienda A', quantity: 5, delivered: true }] },
            { id: 2, rows: [{ customer: 'Tienda A', quantity: 3, delivered: false }] },
            { id: 3, rows: [{ customer: 'Tienda B', quantity: 2, delivered: true }] },
        ];
        const idx = buildStoreIndex(planillas);
        expect(Object.keys(idx)).toEqual(['Tienda A', 'Tienda B']);
        expect(idx['Tienda A'].planillaCount).toBe(2);
        expect(idx['Tienda A'].totalQty).toBe(8);
        expect(idx['Tienda A'].deliveredQty).toBe(5);
        expect(idx['Tienda A'].pendingQty).toBe(3);
        expect(idx['Tienda B'].totalQty).toBe(2);
    });

    test('skips rows without customer name', () => {
        const planillas = [
            { id: 1, rows: [{ customer: '', quantity: 5 }] },
            { id: 2, rows: [{ customer: 'Tienda X', quantity: 3 }] },
        ];
        const idx = buildStoreIndex(planillas);
        expect(Object.keys(idx)).toEqual(['Tienda X']);
    });

    test('empty planillas returns empty index', () => {
        expect(buildStoreIndex([])).toEqual({});
    });
});
