/* ---------- Customer Registry ---------- */

const CUSTOMERS_KEY = 'leaf_customers';

function loadCustomers() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
    } catch { return []; }
}

function saveCustomers(list) {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list));
}

function seedCustomersFromPlanillas() {
    const customers = loadCustomers();
    const existing = new Set(customers.map(c => c.name.toLowerCase().trim()));

    try {
        const planillas = JSON.parse(localStorage.getItem('leaf_planillas') || '[]');
        planillas.forEach(p => (p.rows || []).forEach(r => {
            const name = r.customer?.trim();
            if (name && !existing.has(name.toLowerCase())) {
                customers.push({ id: Date.now() + Math.random(), name, ruc: '', phone: '', alias: '' });
                existing.add(name.toLowerCase());
            }
        }));
    } catch {}

    if (customers.length) saveCustomers(customers);
    return customers;
}

function addCustomer(name) {
    const customers = loadCustomers();
    const exists = customers.some(c => c.name.toLowerCase() === name.toLowerCase().trim());
    if (exists) return;
    customers.push({ id: Date.now(), name: name.trim(), ruc: '', phone: '', alias: '' });
    saveCustomers(customers);
}

/* ---------- Autocomplete Component ---------- */

class Autocomplete {
    constructor(input, options = {}) {
        this.input = input;
        this.minLen = options.minLen || 1;
        this.maxResults = options.maxResults || 100;
        this.onSelect = options.onSelect || null;
        this.customers = seedCustomersFromPlanillas();
        this.index = -1;
        this.build();
        this.bind();
    }

    build() {
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'autocomplete-wrap';
        this.input.parentNode.insertBefore(this.wrapper, this.input);
        this.wrapper.appendChild(this.input);

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'autocomplete-dropdown';
        document.body.appendChild(this.dropdown);
    }

    bind() {
        this.input.addEventListener('input', () => this.search());
        this.input.addEventListener('focus', () => { if (this.input.value.length >= this.minLen) this.search(); });
        this.input.addEventListener('keydown', e => this.handleKey(e));
        document.addEventListener('click', e => {
            if (!this.wrapper.contains(e.target) && !this.dropdown.contains(e.target)) this.close();
        });
        window.addEventListener('scroll', () => this.close(), true);
        window.addEventListener('resize', () => this.close());
    }

    reposition() {
        const rect = this.input.getBoundingClientRect();
        this.dropdown.style.position = 'fixed';
        this.dropdown.style.top = (rect.bottom + 4) + 'px';
        this.dropdown.style.left = rect.left + 'px';
        this.dropdown.style.width = rect.width + 'px';
        this.dropdown.style.zIndex = '1000';
    }

    search() {
        const q = this.input.value.trim();
        if (q.length < this.minLen) { this.close(); return; }

        const ql = q.toLowerCase();
        const results = this.customers.filter(c => {
            const name = (c.name || '').toLowerCase();
            const ruc = (c.ruc || '').toLowerCase();
            const alias = (c.alias || '').toLowerCase();
            return name.includes(ql) || ruc.includes(ql) || alias.includes(ql);
        }).slice(0, this.maxResults);

        this.render(results, q);
        this.reposition();
    }

    render(results, query) {
        this.index = -1;

        if (results.length === 0) {
            this.dropdown.innerHTML = `
                <div class="autocomplete-empty">Sin resultados</div>
                <div class="autocomplete-noresult" data-action="create">+ Crear "${escapeHtml(query)}"</div>
            `;
            this.dropdown.classList.add('show');
            this.dropdown.querySelector('[data-action="create"]')?.addEventListener('click', () => {
                addCustomer(query);
                this.customers = loadCustomers();
                if (this.onSelect) this.onSelect({ name: query });
                this.input.value = query;
                this.close();
            });
            return;
        }

        let html = '';
        results.forEach((c, i) => {
            const meta = [c.ruc, c.phone, c.alias].filter(Boolean).join(' · ');
            html += `
                <div class="autocomplete-item" data-index="${i}">
                    <div class="autocomplete-item-name">${escapeHtml(c.name)}</div>
                    ${meta ? `<div class="autocomplete-item-meta">${escapeHtml(meta)}</div>` : ''}
                </div>
            `;
        });
        html += `<div class="autocomplete-noresult" data-action="create">+ Crear "${escapeHtml(query)}"</div>`;

        this.dropdown.innerHTML = html;
        this.dropdown.classList.add('show');

        this.dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index);
                this.select(results[idx]);
            });
            el.addEventListener('mouseenter', () => {
                this.index = parseInt(el.dataset.index);
                this.highlight();
            });
        });

        this.dropdown.querySelector('[data-action="create"]')?.addEventListener('click', () => {
            addCustomer(query);
            this.customers = loadCustomers();
            if (this.onSelect) this.onSelect({ name: query });
            this.input.value = query;
            this.close();
        });
    }

    handleKey(e) {
        const items = this.dropdown.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.index = Math.min(this.index + 1, items.length - 1);
            this.highlight();
            this.scrollIntoView();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.index = Math.max(this.index - 1, -1);
            this.highlight();
        } else if (e.key === 'Enter') {
            if (this.index >= 0 && items[this.index]) {
                e.preventDefault();
                items[this.index].click();
            }
        } else if (e.key === 'Escape') {
            this.close();
        }
    }

    highlight() {
        this.dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
            el.classList.toggle('active', i === this.index);
        });
    }

    scrollIntoView() {
        const active = this.dropdown.querySelector('.autocomplete-item.active');
        if (active) active.scrollIntoView({ block: 'nearest' });
    }

    select(customer) {
        this.input.value = customer.name;
        if (this.onSelect) this.onSelect(customer);
        this.close();
    }

    close() {
        this.dropdown.classList.remove('show');
        this.dropdown.innerHTML = '';
        this.index = -1;
    }

    refresh() {
        this.customers = seedCustomersFromPlanillas();
    }
}
