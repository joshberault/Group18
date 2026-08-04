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
| Authentication | `/login` | TBD | TBD |

## Project Structure

```
app/
  (app)/          # Authenticated shell routes (sidebar layout)
  login/          # Login page (minimal layout)
  page.tsx        # Redirects to role default workspace
components/
  layout/         # App shell, sidebar, header, role guard
  ui/             # Reusable design system components
  dashboard/      # Dashboard-specific components
  accounting/     # Accounting workspace components
lib/
  roles/          # Centralized demo role and permission config
  supabase/       # Supabase browser client
  types/          # Shared TypeScript types
  mock-data/      # Mock dashboard data (replace with Supabase later)
  navigation.ts   # Single source of truth for sidebar nav
docs/
  role-access.md  # How teammates connect modules to the role system
```

Navigation items are defined in `lib/navigation.ts`. Role visibility is configured in `lib/roles/role-config.ts`.

## Shared Types

Import domain types from `lib/types`:

- `UserRole`, `UserProfile`, `Client`, `Matter`, `TimeEntry`, `Expense`, `Invoice`, `Payment`, `Task`, `ActivityLog`

## Demo Role Switcher

The header includes a demonstration role switcher (not production auth). Selected role is stored in `localStorage`, filters navigation, protects routes, and updates dashboard content.

See **[docs/role-access.md](docs/role-access.md)** for how to add routes, permissions, and connect your module to the role system.

**Important:** Demo role checks are frontend-only. Supabase Row Level Security is still required for production security.

## License

ACCY 628 course project — internal team use.
