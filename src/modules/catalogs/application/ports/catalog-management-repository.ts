import type { AuthenticatedActor } from "@/shared/authorization";
import type {
  CatalogTransitionInput,
  CreateAdmissionPeriodInput,
  CreateMajorInput,
  UpdateAdmissionPeriodInput,
  UpdateMajorInput,
} from "../validation/catalog-management-schemas";

export interface ManagedAdmissionPeriod {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly startDate: Date | null;
  readonly endDate: Date | null;
  readonly isActive: boolean;
  readonly updatedAt: Date;
}

export interface ManagedMajor {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
  readonly updatedAt: Date;
}

export interface CatalogHistoryItem {
  readonly id: string;
  readonly action: string;
  readonly actorName: string | null;
  readonly occurredAt: Date;
}

export interface CatalogMutationContext { readonly requestId: string }
export interface CatalogCommand<T> {
  readonly actor: AuthenticatedActor;
  readonly context: CatalogMutationContext;
  readonly id: string;
  readonly values: T;
}

export interface CatalogManagementRepository {
  listAdmissionPeriods(includeInactive: boolean): Promise<readonly ManagedAdmissionPeriod[]>;
  findAdmissionPeriod(id: string, includeInactive: boolean): Promise<ManagedAdmissionPeriod | null>;
  listMajors(includeInactive: boolean): Promise<readonly ManagedMajor[]>;
  findMajor(id: string, includeInactive: boolean): Promise<ManagedMajor | null>;
  findHistory(entityType: "admission_periods" | "majors", id: string): Promise<readonly CatalogHistoryItem[]>;
  createAdmissionPeriod(actor: AuthenticatedActor, values: CreateAdmissionPeriodInput, context: CatalogMutationContext): Promise<ManagedAdmissionPeriod>;
  updateAdmissionPeriod(command: CatalogCommand<UpdateAdmissionPeriodInput>): Promise<ManagedAdmissionPeriod>;
  transitionAdmissionPeriod(command: CatalogCommand<CatalogTransitionInput> & { readonly active: boolean }): Promise<ManagedAdmissionPeriod>;
  createMajor(actor: AuthenticatedActor, values: CreateMajorInput, context: CatalogMutationContext): Promise<ManagedMajor>;
  updateMajor(command: CatalogCommand<UpdateMajorInput>): Promise<ManagedMajor>;
  transitionMajor(command: CatalogCommand<CatalogTransitionInput> & { readonly active: boolean }): Promise<ManagedMajor>;
}
