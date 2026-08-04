import type { AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError } from "@/shared/errors";
import { assertCatalogAuthorized, CatalogAuthorizationPolicy } from "../authorization/catalog-authorization";
import type { CatalogManagementRepository, CatalogMutationContext } from "../ports/catalog-management-repository";
import {
  parseCatalogTransition,
  parseCreateAdmissionPeriod,
  parseCreateMajor,
  parseUpdateAdmissionPeriod,
  parseUpdateMajor,
} from "../validation/catalog-management-schemas";

export class QueryManagedCatalogs {
  constructor(private readonly repository: CatalogManagementRepository, private readonly policy = new CatalogAuthorizationPolicy()) {}
  async listAdmissionPeriods(actor: AuthenticatedActor) {
    assertCatalogAuthorized(this.policy, "catalog.list", actor);
    return this.repository.listAdmissionPeriods(actor.role !== "SALE");
  }
  async admissionPeriod(actor: AuthenticatedActor, id: string) {
    assertCatalogAuthorized(this.policy, "catalog.read", actor);
    return this.repository.findAdmissionPeriod(id, actor.role !== "SALE");
  }
  async listMajors(actor: AuthenticatedActor) {
    assertCatalogAuthorized(this.policy, "catalog.list", actor);
    return this.repository.listMajors(actor.role !== "SALE");
  }
  async major(actor: AuthenticatedActor, id: string) {
    assertCatalogAuthorized(this.policy, "catalog.read", actor);
    return this.repository.findMajor(id, actor.role !== "SALE");
  }
  async history(actor: AuthenticatedActor, entityType: "admission_periods" | "majors", id: string) {
    assertCatalogAuthorized(this.policy, "catalog.viewHistory", actor);
    const exists = entityType === "admission_periods"
      ? await this.repository.findAdmissionPeriod(id, actor.role !== "SALE")
      : await this.repository.findMajor(id, actor.role !== "SALE");
    if (exists === null) throw new NotFoundError(entityType === "admission_periods" ? "Admission period" : "Major");
    return this.repository.findHistory(entityType, id);
  }
}

export class CatalogAdministrationService {
  constructor(private readonly repository: CatalogManagementRepository, private readonly policy = new CatalogAuthorizationPolicy()) {}
  async createAdmissionPeriod(actor: AuthenticatedActor, input: unknown, context: CatalogMutationContext) {
    assertCatalogAuthorized(this.policy, "catalog.create", actor);
    return this.repository.createAdmissionPeriod(actor, parseCreateAdmissionPeriod(input), context);
  }
  async updateAdmissionPeriod(actor: AuthenticatedActor, id: string, input: unknown, context: CatalogMutationContext) {
    assertCatalogAuthorized(this.policy, "catalog.update", actor);
    return this.repository.updateAdmissionPeriod({ actor, id, values: parseUpdateAdmissionPeriod(input), context });
  }
  async transitionAdmissionPeriod(actor: AuthenticatedActor, id: string, active: boolean, input: unknown, context: CatalogMutationContext) {
    assertCatalogAuthorized(this.policy, active ? "catalog.activate" : "catalog.deactivate", actor);
    return this.repository.transitionAdmissionPeriod({ actor, id, active, values: parseCatalogTransition(input), context });
  }
  async createMajor(actor: AuthenticatedActor, input: unknown, context: CatalogMutationContext) {
    assertCatalogAuthorized(this.policy, "catalog.create", actor);
    return this.repository.createMajor(actor, parseCreateMajor(input), context);
  }
  async updateMajor(actor: AuthenticatedActor, id: string, input: unknown, context: CatalogMutationContext) {
    assertCatalogAuthorized(this.policy, "catalog.update", actor);
    return this.repository.updateMajor({ actor, id, values: parseUpdateMajor(input), context });
  }
  async transitionMajor(actor: AuthenticatedActor, id: string, active: boolean, input: unknown, context: CatalogMutationContext) {
    assertCatalogAuthorized(this.policy, active ? "catalog.activate" : "catalog.deactivate", actor);
    return this.repository.transitionMajor({ actor, id, active, values: parseCatalogTransition(input), context });
  }
}
