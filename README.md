# CounselFlow

**Law Firm Matter and Revenue Management**

ACCY 628 final project — a web-based contract-to-cash management system for a mid-sized law firm.

## Project Purpose

CounselFlow supports the full contract-to-cash lifecycle for legal practice operations:

- Clients and legal matters
- Attorney, paralegal, billing staff, and client roles
- Time tracking and billable expenses
- Tasks and deadlines
- Retainers and trust balances
- Hourly and fixed-fee billing
- Invoice generation and collections
- Payments and accounts receivable
- Write-downs and write-offs
- Matter and client profitability
- Role-specific dashboards
- Accounting controls and audit history

This `main` branch contains the **shared application foundation**. Individual business modules are developed on separate feature branches by teammates.

## Technology Stack

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (authentication and database — foundation only on `main`)
- **Lucide React** (icons)
- **Recharts** (dashboard visualizations)
- **Vercel** (deployment target)

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- A Supabase project (optional for foundation exploration; required for live data later)

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/dashboard`.

### Other Commands

```bash
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npm run typecheck # TypeScript check without emit
```

## Environment Variables

Create a local file named `.env.local` in the project root (never commit this file):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Copy from `.env.example` and fill in values from your Supabase project dashboard (Settings → API).

**Warning:** Never commit `.env.local`, real API keys, or Supabase credentials to GitHub.

## Branch Workflow

- **`main`** is the stable shared branch for foundation and approved merges.
- Each teammate must use a **separate feature branch** for their module.
- Pull the newest `main` before starting new work.
- Do not edit another teammate's assigned module without coordinating first.
- Keep changes to shared files (`components/ui`, `lib/navigation.ts`, layouts) limited and communicate them to the group.
- Test locally before requesting a merge.
- Never commit `.env.local` or Supabase credentials.

## Page Ownership

Assign modules to teammates and record branch names here as work begins:

| Module | Route | Owner | Branch |
|--------|-------|-------|--------|
| Dashboard | `/dashboard` | Shared foundation | `main` |
| Clients | `/clients` | TBD | TBD |
| Matters | `/matters` | TBD | TBD |
| Time & Expenses | `/time` | TBD | TBD |
| Tasks & Deadlines | `/tasks` | TBD | TBD |
| Billing | `/billing` | TBD | TBD |
| Invoices & Collections | `/invoices` | TBD | TBD |
| Accounting | `/accounting` | TBD | TBD |
| Reports | `/reports` | TBD | TBD |
| Client Portal | `/client-portal` | TBD | TBD |

Access is controlled by the **Demo role** dropdown in the header (no login required for now).

## Project Structure

```
app/
  (app)/          # App shell routes (sidebar layout)
  page.tsx        # Redirects to /dashboard
components/
  layout/         # App shell, sidebar, header, navigation
  auth/           # Demo role guards
  ui/             # Reusable design system components
  dashboard/      # Dashboard-specific components
lib/
  auth/           # Demo role access helpers
  supabase/       # Supabase browser client (for future auth)
  types/          # Shared TypeScript types
  mock-data/      # Mock dashboard data (replace with Supabase later)
  navigation.ts   # Single source of truth for sidebar nav + role access
```

Navigation items are defined in `lib/navigation.ts`. Update that file instead of editing sidebar links in multiple places.

## Shared Types

Import domain types from `lib/types`:

- `UserRole`, `UserProfile`, `Client`, `Matter`, `TimeEntry`, `Expense`, `Invoice`, `Payment`, `Task`, `ActivityLog`

## Demo Role Switcher

The header includes a demonstration role switcher (not production auth). Selected role is stored in `localStorage` and updates the dashboard welcome message and role summary.

## License

ACCY 628 course project — internal team use.
