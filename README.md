# Leaf Ltd — Admin Dashboard

Logistics and warehouse management dashboard for **Leaf Ltd**. Built with vanilla HTML, CSS, and JavaScript — no frameworks.

## Modules

| Module | File | Description |
|---|---|---|
| **Dashboard** | `dashboard.html` | KPI stats, quick actions, backup/restore, cleanup old records |
| **Attendance** | `attendance.html` | Daily attendance entry with status dropdowns (Working, Rest, Sick, Holiday) |
| **Attendance Report** | `attendance-report.html` | Monthly grid (employee × days) with modal detail showing entry/exit times and worked hours |
| **Delivery** | `delivery.html` | Delivery invoice entry with autocomplete customer search, creates planillas |
| **Planillas** | `planillas.html` | Planilla list with pagination, detail view with delivered checkboxes, and **Store View** (search by customer name) |
| **Damaged Goods** | `damaged.html` | Damaged product entry form |
| **Damaged Report** | `damaged-report.html` | Monthly damaged goods report with filters and pagination |
| **Employees** | `employees.html` | Employee CRUD with ID deduplication and attendance migration |
| **Users** | `users.html` | User accounts with role-based access (BOSS, OFFICE, MANAGER, EMPLOYEE) |

## Storage

Currently uses **localStorage** (browser-side persistence). All data is stored under the following keys:

- `leaf_users` — User accounts
- `leaf_employees` — Employee records
- `leaf_attendance` — Attendance records keyed by date
- `leaf_planillas` — Delivery planillas
- `leaf_damaged` — Damaged goods records
- `leaf_customers` — Customer autocomplete master list

Use the **Dashboard → Datos** section to export/import all data as JSON.

## Role-Based Access

| Role | Access |
|---|---|
| **BOSS** | All modules |
| **OFFICE** | Attendance, Delivery, Planillas |
| **MANAGER** | Damaged goods, Employees, Users |
| **EMPLOYEE** | Attendance only |

## Testing

Tests are written with **Jest** and located in `js/__tests__/`.

```bash
npm install
npm test
```

### Test coverage

- `utils.test.js` — `escapeHtml`, `getInitials`, `formatDate`, `calcHours`
- `cleanup.test.js` — `cleanupOldPlanillas`, `buildStoreIndex`

## Project Structure

```
Front/
├── index.html                  # Login page
├── dashboard.html              # Main dashboard
├── attendance.html             # Attendance entry
├── attendance-report.html      # Monthly attendance report
├── delivery.html               # Delivery entry
├── planillas.html              # Planilla list + store view
├── damaged.html                # Damaged goods entry
├── damaged-report.html         # Damaged goods report
├── employees.html              # Employee management
├── users.html                  # User management
├── css/
│   └── dashboard.css           # All styles (~2600 lines)
├── js/
│   ├── app.js                  # Shared utilities, sidebar builder, cleanup
│   ├── auth.js                 # Authentication, session, role guard
│   ├── autocomplete.js         # Customer autocomplete component
│   ├── dashboard.js            # Dashboard stats, backup/restore
│   ├── attendance.js           # Attendance CRUD
│   ├── attendance-report.js    # Monthly report + hours calc
│   ├── delivery.js             # Delivery entry + planilla save
│   ├── planillas.js            # Planilla list, detail, store view
│   ├── damaged.js              # Damaged goods CRUD
│   ├── damaged-report.js       # Damaged report + pagination
│   ├── employees.js            # Employee CRUD + dedup
│   ├── users.js                # User CRUD
│   └── __tests__/              # Jest test suites
├── imagenes/
│   └── logo.png
├── package.json
└── README.md
```

## Backend Integration

This frontend currently uses **localStorage**. A Spring Boot backend is available separately with the following API endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authentication |
| GET | `/api/employees` | Employee list |
| POST | `/api/attendance/batch` | Batch attendance save |
| GET/POST | `/api/planillas` | Planilla CRUD |
| GET/POST | `/api/damaged` | Damaged goods CRUD |
| GET/POST | `/api/users` | User CRUD |
| GET | `/api/dashboard/stats` | Dashboard statistics |

## License

Internal use — Leaf Ltd.
