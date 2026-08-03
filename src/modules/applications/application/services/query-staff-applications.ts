import type { AuthenticatedActor } from "@/shared/authorization";
import {
  assertStaffApplicationAuthorized,
  StaffApplicationAuthorizationPolicy,
} from "../authorization/staff-application-authorization";
import type { AdminApplicationDetail, AdminApplicationListItem } from "../dto/admin-application-dto";
import type { AdminApplicationQueryRepository, ApplicationQueryScope } from "../ports/admin-application-query-repository";

function scopeFor(actor: AuthenticatedActor): ApplicationQueryScope {
  if (actor.role === "ADMIN") return { kind: "all" };
  if (actor.role === "SALE") return { kind: "sale", saleId: actor.userId };
  return { kind: "manager", managerId: actor.userId };
}

export class QueryStaffApplications {
  constructor(
    private readonly repository: AdminApplicationQueryRepository,
    private readonly policy = new StaffApplicationAuthorizationPolicy(),
  ) {}

  async list(actor: AuthenticatedActor): Promise<readonly AdminApplicationListItem[]> {
    assertStaffApplicationAuthorized(this.policy, "application.list", actor);
    return this.repository.list(scopeFor(actor));
  }

  async detail(actor: AuthenticatedActor, id: string): Promise<AdminApplicationDetail | null> {
    const resource = await this.repository.findAuthorizationResource(id);
    if (resource === null) return null;
    if (!this.policy.authorize("application.read", actor, resource).allowed) return null;
    return this.repository.findDetail(id, scopeFor(actor));
  }
}
