import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors";
import type { UserAccountStatus } from "../../domain/user";
import { UserAuthorizationPolicy, assertUserAuthorized, type UserCapability } from "../authorization/user-authorization";
import type { PasswordHasher, PasswordVerifier, UserManagementRepository, UserMutationContext } from "../ports/user-repository";
import { parseAccountTransition, parseManagerAssignment, parseOwnPasswordChange, parseProfileUpdate, parseResetPassword, parseRoleChange } from "../validation/user-management-schemas";

export class UserAdministrationService {
  constructor(
    private readonly repository: UserManagementRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordVerifier: PasswordVerifier,
    private readonly policy = new UserAuthorizationPolicy(),
  ) {}

  private async authorize(actor: AuthenticatedActor, id: string, capability: UserCapability): Promise<void> {
    const resource = await this.repository.findAuthorizationResource(id);
    if (resource === null) throw new NotFoundError("User");
    assertUserAuthorized(this.policy, capability, actor, resource);
  }
  async updateProfile(actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, "user.updateProfile");
    const values = parseProfileUpdate(input);
    if (actor.role !== "ADMIN" && values.username !== undefined) throw new ForbiddenError();
    return this.repository.updateProfile({ actor, id, context, values });
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
  async changeOwnPassword(actor: AuthenticatedActor, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, actor.userId, "user.changeOwnPassword");
    const values = parseOwnPasswordChange(input);
    const currentHash = await this.repository.findPasswordHash(actor.userId);
    if (currentHash === null || !await this.passwordVerifier.verify(values.currentPassword, currentHash)) {
      throw new ValidationError([{ path: ["currentPassword"], code: "custom", message: "Mật khẩu hiện tại không đúng." }]);
    }
    const passwordHash = await this.passwordHasher.hash(values.newPassword);
    return this.repository.changeOwnPassword({
      actor,
      id: actor.userId,
      context,
      passwordHash,
      values: {
        expectedRole: values.expectedRole,
        expectedStatus: values.expectedStatus,
        expectedUpdatedAt: values.expectedUpdatedAt,
      },
    });
  }
  async revokeSessions(actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) {
    await this.authorize(actor, id, "user.revokeSessions");
    return this.repository.revokeSessions({ actor, id, context, values: parseAccountTransition(input) });
  }
}

export class QueryUsers {
  constructor(private readonly repository: UserManagementRepository, private readonly policy = new UserAuthorizationPolicy()) {}
  async list(actor: AuthenticatedActor) { assertUserAuthorized(this.policy, "user.list", actor); return this.repository.list(actor); }
  async activeManagerOptions(actor: AuthenticatedActor) {
    assertUserAuthorized(this.policy, "user.listManagerOptions", actor);
    return this.repository.listActiveManagerOptions();
  }
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
