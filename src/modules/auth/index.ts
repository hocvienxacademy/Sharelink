export {
  ADMIN_SESSION_COOKIE,
  authenticateAdmin,
  getAdminIdentityBySessionToken,
  resolveAdminLoginEmail,
  revokeAdminSession,
  type AdminIdentity,
  type AuthenticatedAdminSession,
} from "./application/authentication";
