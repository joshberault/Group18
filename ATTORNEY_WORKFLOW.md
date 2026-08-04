# Attorney Workflow (George Giddens)

Branch: `feature/attorney-workflow-george-giddens`

## What this feature owns

- **Tables:** `time_entries`, `tasks`, `deadlines`, `attorney_notes`, `expense_submissions`
- **Pages:** `/attorney/dashboard`, `/attorney/matters`, `/attorney/time`, `/attorney/expenses`, `/attorney/tasks`
- **RLS:** Staff see/insert own time & expenses; managers/admins see all

## Shared stubs (coordinate with teammates)

| Table | Primary owner | Notes |
|-------|---------------|-------|
| `clients`, `matters`, `practice_areas` | Joseph (client-management) | Stub seed data included |
| `profiles` | Reagan (admin) | Minimal role column for RLS |
| `matter_assignments` | Reagan (admin) | Stub assignments via seed SQL |
| `expense_submissions` | George → Josh (accounting) | Attorney submits; accounting consumes |

## Setup

1. `npm install`
2. Ensure `.env.local` has Supabase URL + publishable key
3. Migration already applied: `supabase/migrations/20260804180000_attorney_workflow.sql`
4. Create auth user in Supabase Dashboard
5. Set role: `UPDATE profiles SET role = 'attorney' WHERE id = '<your-user-id>';`
6. Run `supabase/seed_assignments.sql` with your user ID
7. `npm run dev` → visit `/attorney/dashboard`

## Role access

Allowed: `attorney`, `manager`, `paralegal`, `staffer`, `admin`  
Blocked: `client` (redirected to home with unauthorized message)

## Team boundaries

Do **not** modify on this branch:
- Client portal (Reigan)
- Billing/invoicing (Allyson)
- Accounting engine (Josh) — except `expense_submissions` handoff
- Admin approval UI (Reagan) — time entries stay `pending` until approved there
- Analytics (Bryton)
