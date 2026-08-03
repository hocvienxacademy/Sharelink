import type { AuthenticatedActor } from "@/shared/authorization";
import {
  assertRegistrationLinkAuthorized,
  RegistrationLinkAuthorizationPolicy,
  type AdminCapability,
} from "../authorization/registration-link-authorization";
import type {
  AdminRegistrationLinkDetail,
  AdminRegistrationLinkHistory,
  AdminRegistrationLinkListItem,
} from "../dto/admin-registration-link-dto";
import type {
  AdminRegistrationLinkQueryRepository,
  RegistrationLinkQueryScope,
} from "../ports/admin-registration-link-query-repository";

function scopeFor(actor: AuthenticatedActor): RegistrationLinkQueryScope {
  if (actor.role === "ADMIN") return { kind: "all" };
  if (actor.role === "SALE") return { kind: "sale", saleId: actor.userId };
  return { kind: "manager", managerId: actor.userId };
}

export class QueryRegistrationLinks {
  constructor(
    private readonly repository: AdminRegistrationLinkQueryRepository,
    private readonly policy = new RegistrationLinkAuthorizationPolicy(),
  ) {}

  async list(actor: AuthenticatedActor, includeArchived = false): Promise<readonly AdminRegistrationLinkListItem[]> {
    assertRegistrationLinkAuthorized(this.policy, "registrationLink.list", { actor });
    return this.repository.list(scopeFor(actor), includeArchived);
  }

  async detail(actor: AuthenticatedActor, id: string): Promise<AdminRegistrationLinkDetail | null> {
    const resource = await this.authorizedResource(actor, id, "registrationLink.read");
    if (resource === null) return null;
    assertRegistrationLinkAuthorized(this.policy, "registrationLink.viewHistory", { actor, resource });
    const scope = scopeFor(actor);
    const detail = await this.repository.findDetail(id, scope);
    if (detail === null) return null;
    const canCopy = this.policy.authorize("registrationLink.copyPublicUrl", { actor, resource }).allowed;
    const token = canCopy ? await this.repository.findActivePublicToken(id, scope) : null;
    return { ...detail, publicUrl: token === null ? null : `/dang-ky/${token}` };
  }

  async history(actor: AuthenticatedActor, id: string): Promise<AdminRegistrationLinkHistory | null> {
    const resource = await this.authorizedResource(actor, id, "registrationLink.viewHistory");
    return resource === null ? null : this.repository.findHistory(id, scopeFor(actor));
  }

  private async authorizedResource(
    actor: AuthenticatedActor,
    id: string,
    capability: AdminCapability,
  ) {
    const resource = await this.repository.findAuthorizationResource(id);
    if (resource === null) {
      return null;
    }
    assertRegistrationLinkAuthorized(this.policy, capability, { actor, resource });
    return resource;
  }
}
