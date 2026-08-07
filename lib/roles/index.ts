export type { Permission } from "./permissions";
export { PERMISSIONS } from "./permissions";
export {
  canAccessRoute,
  DEFAULT_DEMO_ROLE,
  DEMO_IDENTITIES,
  DEMO_ROLE_STORAGE_KEY,
  getDefaultRouteForRole,
  getNavigationForRole,
  getPermissionsForRole,
  getRoleDefinition,
  hasPermission,
  isValidDemoRole,
  pathnameToRouteKey,
} from "./role-config";
export { initialsFromName, resolveDemoIdentity } from "./demo-identity";
