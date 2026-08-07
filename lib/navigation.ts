/**
 * Compatibility shim.
 * Navigation was moved to lib/navigation/index.ts after the main merge.
 * Keep this file so bundlers that still resolve @/lib/navigation → navigation.ts
 * (or a stale .next graph) can compile.
 */
export {
  NAV_ITEMS,
  getNavItemsForRole,
  getNavRoles,
  nestBillingCollectionsNav,
} from "./navigation/index";
export type { NavItem, RouteKey } from "./navigation/types";
