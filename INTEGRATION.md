# Attorney Workflow — Team Integration & Blockers

This document lists what **George's attorney workflow** delivers on its own, what **depends on teammates**, and what **other features consume from this branch**.

---

## What ships complete on this branch (no teammate required)

| Area | Status |
|------|--------|
| Attorney / paralegal **My Dashboard** (`/attorney/dashboard`) | ✅ |
| Role-based home redirect (demo dropdown) | ✅ |
| Time: timer, manual entry, edit, delete | ✅ |
| Tasks: today, all, detail, completion | ✅ |
| Deadlines: create, list | ✅ |
| Case notes: CRUD | ✅ |
| Calendar | ✅ |
| Matter timeline + document checklist | ✅ |
| Hours by matter (personal) | ✅ |
| Hours by attorney (managing partner only) | ✅ |
| Sidebar + page guards by demo role | ✅ |
| Supabase tables + RLS migration | ✅ |
| Demo seed data + browser persistence | ✅ |

---

## Blocked by teammates (not complete until they ship)

### Joseph — Client Management (`feature/client-management`)

**You need from Joseph:**

| Your feature uses | Why it's blocked |
|-------------------|------------------|
| Live `clients`, `matters`, `practice_areas` | You have **stub tables + demo data** only |
| `/clients` and `/matters` firm-wide pages | Still placeholders — attorneys use `/attorney/matters` with demo assignments |
| Authoritative billing type, rates, engagement letters | Matter cards show demo values, not firm CRM |
| Conflict checks on new matters | `conflict_flag` in seed only |

**What you can do now:** Demo mode with `DEMO_MATTERS` in `lib/attorney/demo-data.ts`.

**When Joseph merges:** Replace demo matters with Supabase queries filtered by `matter_assignments`.

---

### Reagan — Admin (`feature/admin`)

**You need from Reagan:**

| Your feature uses | Why it's blocked |
|-------------------|------------------|
| Real login / sessions | Removed for demo; dropdown simulates roles |
| `profiles` + user CRUD | Minimal stub table only |
| `matter_assignments` UI | Seed SQL only — no admin screen to assign attorneys to matters |
| **Time entry approval** | Entries stay `pending` forever — no manager approve/reject UI |
| **Expense approval** | Same — Reagan owns approval workflow |
| Unified role enum | DB: `admin`, `manager`, `attorney` vs UI: `managing_partner`, `firm_administrator` |

**What you can do now:** Demo role dropdown + localStorage CRUD.

**When Reagan merges:** Wire `AttorneyDataProvider` to Supabase, enforce RLS, connect approval status updates.

---

### Josh — Accounting (`feature/accounting`)

**Josh pulls from you:**

| Your table / flow | Josh's responsibility |
|-------------------|----------------------|
| `expense_submissions` | Read approved expenses into accounting / GL |
| Approved `time_entries` (future) | Post labor costs / WIP |

**Blocked on your side:**

| Item | Status |
|------|--------|
| `/attorney/expenses` | Still on old preview/Supabase stub — **not** in `AttorneyDataProvider` yet |
| Expense → accounting pipeline | No UI on Josh's branch to consume submissions |

**Handoff contract:** You insert rows into `expense_submissions`; Josh builds accounting views that read them.

---

### Allyson — Billing (`feature/billing`)

**Allyson pulls from you:**

| Your data | Allyson's use |
|-----------|---------------|
| Approved billable `time_entries` | Pre-bill review, invoice line items |
| Matter hourly rates (from matters) | Rate application on invoices |

**Blocked:**

| Item | Why |
|------|-----|
| Time → invoice flow | No billing module yet |
| `/billing`, `/invoices` | Placeholders |
| "Approved" time having billing effect | Needs Reagan approval + Allyson billing engine |

---

### Bryton — Analytics (`feature/analytics-dashboard`)

**Overlap to coordinate:**

| Your feature | Bryton's feature |
|--------------|------------------|
| Hours by matter (personal) on attorney dashboard | Firm-wide profitability reports |
| Hours by attorney (managing partner widget) | Utilization / analytics dashboards |

**Not blocked for demo** — avoid duplicating the same charts on `/reports` when Bryton builds analytics.

---

### Reigan — Client Portal (`feature/client-portal`)

**Boundary (not a blocker for building):**

| Your data | Must NOT appear in client portal |
|-----------|----------------------------------|
| `attorney_notes` | Internal only |
| Raw time entries, internal tasks | Internal only |
| Document checklist (internal) | Internal only |

**When Reigan merges:** RLS must ensure clients only see portal-safe views.

---

## Cross-feature map (who pulls from whom)

```
Joseph (clients/matters)
    ↓ matter_id, client info, rates
George (attorney workflow) ← YOU
    ↓ time_entries, expense_submissions, tasks
Reagan (admin) ← approvals, assignments, auth
    ↓ approved time/expenses
Allyson (billing) ← invoices
Josh (accounting) ← GL / trust
Bryton (analytics) ← firm reports
Reigan (portal) ← client-safe subset only
```

---

## Role-based dashboard behavior (demo mode)

| Demo role | Home route | Sees on sidebar | Hidden |
|-----------|------------|-----------------|--------|
| **Attorney** | `/attorney/dashboard` | My Dashboard, Time, Tasks, Calendar, Notes | Firm dashboard, Billing, Accounting, Hours by attorney |
| **Paralegal** | `/attorney/dashboard` | Same as attorney | Same |
| **Managing Partner** | `/dashboard` | Firm dashboard + Attorney Hub + all modules | — |
| **Billing Specialist** | `/billing` | Time (log/review), Billing, Invoices, Accounting | Attorney Hub, Case Notes |
| **Firm Administrator** | `/dashboard` | Clients, Matters, Billing, Accounting | Attorney Hub |
| **Client** | `/client-portal` | My Portal only | All staff modules |

---

## Recommended merge order to main

1. **This branch** — attorney hub + role routing (safe; scoped to `/attorney/*` + shared nav helpers)
2. **Joseph** — matters feed attorney dropdowns
3. **Reagan** — auth + approvals + assignments
4. **Allyson / Josh** — consume approved time & expenses
5. **Bryton / Reigan** — parallel with clear RLS boundaries

---

## After merge: wire to production (checklist)

- [ ] Replace localStorage with Supabase in `AttorneyDataProvider`
- [ ] Filter matters/tasks by `matter_assignments` for logged-in user
- [ ] Connect time/expense status to Reagan's approval API
- [ ] Align DB role enum with UI roles
- [ ] Move expenses into shared attorney data layer
- [ ] Add automated tests
