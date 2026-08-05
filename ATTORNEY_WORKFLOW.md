# Attorney Workflow (George Giddens)

## What this feature owns

- **Tables:** `time_entries`, `tasks`, `deadlines`, `attorney_notes`, `expense_submissions`
- **Pages:** `/attorney/dashboard`, `/attorney/matters`, `/attorney/time`, `/attorney/expenses`, `/attorney/tasks`
- **RLS:** Staff see/insert own time & expenses; managers/admins see all

## Demo role access (no login)

Use the **Demo role** dropdown in the header to switch roles and see who can access each area:

| Role | Attorney Hub | Billing / Accounting | Client Portal |
|------|--------------|----------------------|---------------|
| Managing Partner | Yes | Yes | Yes |
| Attorney | Yes | No | No |
| Paralegal | Yes | No | No |
| Billing Specialist | Time only | Yes | No |
| Firm Administrator | No | Yes | Yes |
| Client | No | No | Yes |

Sidebar nav and page guards update automatically when you change roles. Sample data is shown until real Supabase auth is added.

## Shared stubs (coordinate with teammates)

| Table | Primary owner | Notes |
|-------|---------------|-------|
| `clients`, `matters`, `practice_areas` | Joseph (client-management) | Stub seed data included |
| `profiles` | Reagan (admin) | Minimal role column for RLS |
| `matter_assignments` | Reagan (admin) | Stub assignments via seed SQL |
| `expense_submissions` | George → Josh (accounting) | Attorney submits; accounting consumes |

## Setup

1. `npm install`
2. Optional: add Supabase URL + publishable key to `.env.local` for future auth
3. Migration already applied: `supabase/migrations/20260804180000_attorney_workflow.sql`
4. `npm run dev` → visit `/dashboard` and switch demo roles in the header

## Team boundaries

Do **not** modify without coordinating:
- Client portal (Reigan)
- Billing/invoicing (Allyson)
- Accounting engine (Josh) — except `expense_submissions` handoff
- Admin approval UI (Reagan) — time entries stay `pending` until approved there
- Analytics (Bryton)
