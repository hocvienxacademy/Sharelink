import type { AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError } from "@/shared/errors";
import type { UserAccountStatus } from "../../domain/user";
import { UserAuthorizationPolicy, assertUserAuthorized, type UserCapability } from "../authorization/user-authorization";
import type { PasswordHasher, UserManagementRepository, UserMutationContext } from "../ports/user-repository";
import { parseAccountTransition, parseManagerAssignment, parseProfileUpdate, parseResetPassword, parseRoleChange } from "../validation/user-management-schemas";

export class UserAdministrationService {
  constructor(private readonly repository: UserManagementRepository, private readonly passwordHasher: PasswordHasher, private readonly policy = new UserAuthorizationPolicy()) {}

  private async authorize(actor: AuthenticatedActor, id: string, capability: UserCapability): Promise<void> {
    const resource = await this.repository.findAuthorizationResource(id);
    if (resource === null) throw new NotFoundError("User");
    assertUserAuthorized(this.policy, capability, actor, resource);
  }
  async updateProfile(actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, "user.updateProfile");
    return this.repository.updateProfile({ actor, id, context, values: parseProfileUpdate(input) });
  }
  async changeRole(actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, "user.changeRole");
    return this.repository.changeRole({ actor, id, context, values: parseRoleChange(input) });
  }
  async assignManager(actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, "user.assignManager");
    return this.repository.assignManager({ actor, id, context, values: parseManagerAssignment(input) });
  }
  async transitionAccount(actor: AuthenticatedActor, id: string, targetStatus: UserAccountStatus, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, targetStatus === "ACTIVE" ? "user.enable" : "user.disable");
    return this.repository.transitionAccount({ actor, id, context, targetStatus, values: parseAccountTransition(input) });
  }
  async unlockSecurity(actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, "user.unlockSecurity");
    return this.repository.unlockSecurity({ actor, id, context, values: parseAccountTransition(input) });
  }
  async resetPassword(actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, "user.resetPassword");
    const values = parseResetPassword(input);
    const passwordHash = await this.passwordHasher.hash(values.password);
    return this.repository.resetPassword({ actor, id, context, passwordHash, values });
  }
  async revokeSessions(actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, "user.revokeSessions");
    return this.repository.revokeSessions({ actor, id, context, values: parseAccountTransition(input) });
  }
}

export class QueryUsers {
  constructor(private readonly repository: UserManagementRepository, private readonly policy = new UserAuthorizationPolicy()) {}
  async list(actor: AuthenticatedActor) { assertUserAuthorized(this.policy, "user.list", actor); return this.repository.list(actor); }
  async detail(actor: AuthenticatedActor, id: string) {
    const resource = await this.repository.findAuthorizationResource(id);
    if (resource === null) return null;
    assertUserAuthorized(this.policy, "user.read", actor, resource);
    return this.repository.findDetail(actor, id);
  }
  async history(actor: AuthenticatedActor, id: string) {
    const resource = await this.repository.findAuthorizationResource(id);
    if (resource === null) return null;
    assertUserAuthorized(this.policy, "user.viewHistory", actor, resource);
    return this.repository.findHistory(actor, id);
  }
}
