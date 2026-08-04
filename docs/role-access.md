# Role-Based Access (Demo)

CounselFlow uses a **centralized demo role system** for frontend navigation, page access, and UI permissions. This is for demonstration and development only.

**Production security must also be enforced through Supabase Row Level Security (RLS)** and authenticated server-side checks.

## Available Demo Roles

| Role | Default landing page |
|------|---------------------|
| Managing Partner | `/dashboard` |
| Attorney | `/dashboard` |
| Paralegal | `/dashboard` |
| Billing Specialist | `/dashboard` |
| Accounting Manager | `/accounting` |
| Firm Administrator | `/dashboard` |
| Client | `/client-portal` |

Demo identities (fake names) are defined in `lib/roles/role-config.ts`.

## Where Roles Are Defined

- **Role union type:** `lib/types/index.ts` (`UserRole`)
- **Role labels:** `lib/types/index.ts` (`USER_ROLE_LABELS`)
- **Permissions:** `lib/roles/permissions.ts`
- **Role behavior (routes, permissions, dashboard copy):** `lib/roles/role-config.ts`
- **Navigation items:** `lib/navigation.ts`
- **Runtime state:** `components/layout/DemoRoleProvider.tsx`

## How Permissions Work

Permissions are reusable string identifiers (for example `view_accounting`, `manage_tasks`).

Check permissions in components:

```tsx
import { useDemoRole } from "@/components/layout/DemoRoleProvider";

const { hasPermission } = useDemoRole();

if (hasPermission("view_trust_balances")) {
  // render trust section
}
```

Helper functions are also exported from `lib/roles/role-config.ts`:

- `hasPermission(role, permission)`
- `canAccessRoute(role, pathname)`
- `getNavigationForRole(role)`
- `getDefaultRouteForRole(role)`

## How Navigation Is Filtered

1. All sidebar links are defined once in `lib/navigation.ts` with a `routeKey`.
2. Each role lists allowed `routeKey` values in `lib/roles/role-config.ts`.
3. `DemoRoleProvider` exposes `navigationItems` filtered for the selected role.
4. `Sidebar` renders only `navigationItems` from context.

## Adding a Route to a Role

1. Add the nav item to `lib/navigation.ts` with a unique `routeKey` and `href`.
2. Add the `routeKey` to the `allowedRoutes` array for each role that should see it in `lib/roles/role-config.ts`.
3. Add any new permissions to `lib/roles/permissions.ts`.
4. Assign those permissions to roles in `lib/roles/role-config.ts`.
5. Use `hasPermission()` inside your page/components for buttons, sections, and actions.

## How Pages Check Permissions

### Route-level (page access)

`RoleGuard` in `app/(app)/layout.tsx` wraps all authenticated pages. If the current pathname is not allowed for the selected role, an **Access Restricted** page is shown.

### Section/action-level (UI inside a page)

Use `useDemoRole().hasPermission("permission_id")` before rendering restricted UI.

Example: `components/accounting/AccountingWorkspace.tsx`

## Unauthorized Route Handling

- **Sidebar:** unauthorized links are hidden.
- **Direct URL:** `RoleGuard` shows `AccessRestricted` with a button back to the role default workspace.
- **Role switch while on unauthorized page:** `DemoRoleProvider` redirects to the new role's `defaultRoute`.

## localStorage Persistence

Selected demo role is stored in `localStorage` under `counselflow-demo-role` and restored on refresh via `useSyncExternalStore` to avoid hydration mismatches.

## Backend Security Reminder

This system is **demo frontend authorization only**. Teammates must still:

- Enforce Supabase Auth for real users
- Apply Supabase RLS policies per role and firm data scope
- Validate permissions on server actions and API routes

## Connecting Your Module

1. Keep your feature code in your module route (for example `app/(app)/billing/`).
2. Register your route in `lib/navigation.ts`.
3. Update `lib/roles/role-config.ts` for which roles can access it.
4. Gate sections/actions with `hasPermission()`.
5. Do **not** hardcode role name checks across components — use permissions.
