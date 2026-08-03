import type { UserRole } from "@/modules/users/domain/user";

export interface AuthenticatedActor {
  readonly userId: string;
  readonly username: string;
  readonly role: UserRole;
}

export function toAuthenticatedActor(identity: { readonly id: string; readonly username: string; readonly role: UserRole }): AuthenticatedActor {
  return { userId: identity.id, username: identity.username, role: identity.role };
}
