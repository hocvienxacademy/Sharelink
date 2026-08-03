import { AdminAuthenticationService } from "@/modules/auth/application/authentication";
import { PrismaAuthenticationRepository } from "@/modules/auth/infrastructure/prisma-authentication-repository";
import { verifyPasswordOrDummy } from "@/modules/auth/infrastructure/security/password";

export const adminAuthentication = new AdminAuthenticationService(
  new PrismaAuthenticationRepository(),
  { verifyPassword: verifyPasswordOrDummy },
);

export const authenticateAdmin = adminAuthentication.authenticate.bind(
  adminAuthentication,
);
export const getAdminIdentityBySessionToken =
  adminAuthentication.getIdentity.bind(adminAuthentication);
export const revokeAdminSession = adminAuthentication.revoke.bind(
  adminAuthentication,
);
