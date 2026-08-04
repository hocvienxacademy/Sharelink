import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import type { Clock } from "@/shared/time";
import { systemClock } from "@/shared/time";
import type { CatalogRepository } from "@/modules/catalogs";
import { toEditableApplicationDto } from "../mappers/application-mapper";
import type { EditableApplicationDto } from "../dto/application-dto";
import { DefaultSubmissionPolicy } from "../policies/default-submission-policy";
import type { SubmissionPolicy } from "../ports/application-repository";
import type { AdminApplicationQueryRepository } from "../ports/admin-application-query-repository";
import type { StaffApplicationRepository, StaffMutationScope } from "../ports/staff-application-repository";
import { StaffApplicationAuthorizationPolicy, assertStaffApplicationAuthorized } from "../authorization/staff-application-authorization";
import { parseRequestRevision, parseStaffReviewApplication, parseStaffUpdateApplication } from "../validation/staff-application-schemas";

const scopeFor = (actor: AuthenticatedActor): StaffMutationScope => actor.role === "ADMIN"
  ? { kind: "all" } : { kind: "manager", managerId: actor.userId };

export class StaffApplicationAdministration {
  constructor(
    private readonly queries: AdminApplicationQueryRepository,
    private readonly repository: StaffApplicationRepository,
    private readonly catalogs: CatalogRepository,
    private readonly submissionPolicy: SubmissionPolicy = new DefaultSubmissionPolicy(),
    private readonly policy = new StaffApplicationAuthorizationPolicy(),
    private readonly clock: Clock = systemClock,
  ) {}

  private async context(actor: AuthenticatedActor, id: string, capability: "application.updateContent" | "application.requestRevision" | "application.validate") {
    const resource = await this.queries.findAuthorizationResource(id);
    if (resource === null) throw new NotFoundError("Application");
    assertStaffApplicationAuthorized(this.policy, capability, actor, resource);
    return resource;
  }

  async updateContent(actor: AuthenticatedActor, id: string, input: unknown, requestId: string): Promise<EditableApplicationDto> {
    const resource = await this.context(actor, id, "application.updateContent");
    const values = parseStaffUpdateApplication(input);
    const existing = await this.repository.findById(id);
    if (existing === null) throw new NotFoundError("Application");
    if (existing.version !== values.expectedVersion || existing.status !== resource.status) throw new ConflictError();
    if (values.majorId !== null && values.majorId !== undefined && await this.catalogs.findActiveMajorById(values.majorId) === null) {
      throw new ValidationError([{ path: ["majorId"], code: "invalid_major", message: "Ngành đã chọn không khả dụng." }]);
    }
    const majorId = values.majorId;
    const entryQualification = values.entryQualification;
    const changedFields = Object.keys(values).filter((key) => key !== "expectedVersion");
    const updated = await this.repository.updateContent({ actorId: actor.userId, actorRole: actor.role as "MANAGER" | "ADMIN", applicationId: id, changedFields, expectedStatus: resource.status as "DRAFT" | "SUBMITTED" | "NEEDS_REVISION", expectedVersion: values.expectedVersion, requestId, scope: scopeFor(actor), values, majorId, entryQualification });
    return toEditableApplicationDto(updated);
  }

  async requestRevision(actor: AuthenticatedActor, id: string, input: unknown, requestId: string): Promise<EditableApplicationDto> {
    await this.context(actor, id, "application.requestRevision");
    const values = parseRequestRevision(input);
    return toEditableApplicationDto(await this.repository.review({ actorId: actor.userId, actorRole: actor.role as "MANAGER" | "ADMIN", applicationId: id, expectedVersion: values.expectedVersion, newStatus: "NEEDS_REVISION", reason: values.reason, requestId, reviewedAt: this.clock.now(), scope: scopeFor(actor) }));
  }

  async validate(actor: AuthenticatedActor, id: string, input: unknown, requestId: string): Promise<EditableApplicationDto> {
    await this.context(actor, id, "application.validate");
    const values = parseStaffReviewApplication(input);
    const application = await this.repository.findById(id);
    if (application === null) throw new NotFoundError("Application");
    const issues = this.submissionPolicy.validate(application);
    if (issues.length > 0) throw new ValidationError(issues);
    return toEditableApplicationDto(await this.repository.review({ actorId: actor.userId, actorRole: actor.role as "MANAGER" | "ADMIN", applicationId: id, expectedVersion: values.expectedVersion, newStatus: "VALID", reason: null, requestId, reviewedAt: this.clock.now(), scope: scopeFor(actor) }));
  }
}
