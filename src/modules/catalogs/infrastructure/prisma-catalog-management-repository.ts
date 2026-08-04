import type { Prisma } from "@/generated/prisma/client";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { executePrismaOperation, prisma } from "@/shared/infrastructure/database/prisma";
import type {
  CatalogCommand,
  CatalogHistoryItem,
  CatalogManagementRepository,
  CatalogMutationContext,
  ManagedAdmissionPeriod,
  ManagedMajor,
} from "../application/ports/catalog-management-repository";
import type {
  CatalogTransitionInput,
  CreateAdmissionPeriodInput,
  CreateMajorInput,
  UpdateAdmissionPeriodInput,
  UpdateMajorInput,
} from "../application/validation/catalog-management-schemas";

const periodSelect = {
  id: true, code: true, name: true, start_date: true, end_date: true,
  is_active: true, updated_at: true,
} as const;
const majorSelect = {
  id: true, code: true, name: true, display_order: true, is_active: true, updated_at: true,
} as const;

type PeriodRow = { id: string; code: string; name: string; start_date: Date | null; end_date: Date | null; is_active: boolean; updated_at: Date };
type MajorRow = { id: string; code: string; name: string; display_order: number; is_active: boolean; updated_at: Date };

const mapPeriod = (row: PeriodRow): ManagedAdmissionPeriod => ({
  id: row.id, code: row.code, name: row.name, startDate: row.start_date,
  endDate: row.end_date, isActive: row.is_active, updatedAt: row.updated_at,
});
const mapMajor = (row: MajorRow): ManagedMajor => ({
  id: row.id, code: row.code, name: row.name, displayOrder: row.display_order,
  isActive: row.is_active, updatedAt: row.updated_at,
});
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const nextTimestamp = (current: Date) => new Date(Math.max(Date.now(), current.getTime() + 1));

export class PrismaCatalogManagementRepository implements CatalogManagementRepository {
  async listAdmissionPeriods(includeInactive: boolean): Promise<readonly ManagedAdmissionPeriod[]> {
    const rows = await executePrismaOperation(() => prisma.admission_periods.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: [{ start_date: "desc" }, { code: "asc" }], select: periodSelect,
    }));
    return rows.map(mapPeriod);
  }

  async findAdmissionPeriod(id: string, includeInactive: boolean): Promise<ManagedAdmissionPeriod | null> {
    const row = await executePrismaOperation(() => prisma.admission_periods.findFirst({
      where: { id, ...(includeInactive ? {} : { is_active: true }) }, select: periodSelect,
    }));
    return row === null ? null : mapPeriod(row);
  }

  async listMajors(includeInactive: boolean): Promise<readonly ManagedMajor[]> {
    const rows = await executePrismaOperation(() => prisma.majors.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: [{ display_order: "asc" }, { code: "asc" }], select: majorSelect,
    }));
    return rows.map(mapMajor);
  }

  async findMajor(id: string, includeInactive: boolean): Promise<ManagedMajor | null> {
    const row = await executePrismaOperation(() => prisma.majors.findFirst({
      where: { id, ...(includeInactive ? {} : { is_active: true }) }, select: majorSelect,
    }));
    return row === null ? null : mapMajor(row);
  }

  async findHistory(entityType: "admission_periods" | "majors", id: string): Promise<readonly CatalogHistoryItem[]> {
    const rows = await executePrismaOperation(() => prisma.audit_logs.findMany({
      where: { entity_type: entityType, entity_id: id },
      orderBy: [{ created_at: "desc" }, { id: "desc" }], take: 100,
      select: { id: true, action: true, created_at: true, users: { select: { full_name: true } } },
    }));
    return rows.map((row) => ({ id: row.id, action: row.action, actorName: row.users?.full_name ?? null, occurredAt: row.created_at }));
  }

  async createAdmissionPeriod(actor: AuthenticatedActor, values: CreateAdmissionPeriodInput, context: CatalogMutationContext): Promise<ManagedAdmissionPeriod> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      const now = new Date();
      const row = await transaction.admission_periods.create({ data: {
        code: values.code, name: values.name, start_date: toDate(values.startDate), end_date: toDate(values.endDate),
        is_active: false, created_at: now, updated_at: now,
      }, select: periodSelect });
      await this.audit(transaction, actor, context, "ADMISSION_PERIOD_CREATED", "admission_periods", row.id, undefined, { status: "INACTIVE" });
      return mapPeriod(row);
    }));
  }

  async updateAdmissionPeriod(command: CatalogCommand<UpdateAdmissionPeriodInput>): Promise<ManagedAdmissionPeriod> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      const current = await this.lockPeriod(transaction, command.id);
      this.assertVersion(current.updated_at, command.values.expectedUpdatedAt);
      const references = await this.periodReferenceCount(transaction, command.id);
      const startDate = command.values.startDate === undefined ? current.start_date : toDate(command.values.startDate);
      const endDate = command.values.endDate === undefined ? current.end_date : toDate(command.values.endDate);
      const codeChanged = command.values.code !== undefined && command.values.code !== current.code;
      const datesChanged = (command.values.startDate !== undefined && startDate?.getTime() !== current.start_date?.getTime())
        || (command.values.endDate !== undefined && endDate?.getTime() !== current.end_date?.getTime());
      if (references > 0 && (codeChanged || datesChanged)) {
        throw new ConflictError("Kỳ tuyển sinh đã được tham chiếu; chỉ được phép đổi tên.");
      }
      const changedFields = [
        codeChanged ? "code" : null,
        command.values.name !== undefined && command.values.name !== current.name ? "name" : null,
        datesChanged ? "dateRange" : null,
      ].filter((value): value is string => value !== null);
      if (changedFields.length === 0) throw new ConflictError("Thông tin kỳ tuyển sinh không thay đổi.");
      if (current.is_active && datesChanged) {
        if (startDate === null || endDate === null) throw new ConflictError("Kỳ active phải có đủ khoảng ngày.");
        await this.lockPeriodSchedule(transaction);
        await this.assertNoPeriodOverlap(transaction, command.id, startDate, endDate);
      }
      const row = await transaction.admission_periods.update({ where: { id: command.id }, data: {
        ...(command.values.code === undefined ? {} : { code: command.values.code }),
        ...(command.values.name === undefined ? {} : { name: command.values.name }),
        ...(command.values.startDate === undefined ? {} : { start_date: startDate, end_date: endDate }),
        updated_at: nextTimestamp(current.updated_at),
      }, select: periodSelect });
      await this.audit(transaction, command.actor, command.context, "ADMISSION_PERIOD_UPDATED", "admission_periods", row.id, undefined, undefined, { changedFields });
      return mapPeriod(row);
    }));
  }

  async transitionAdmissionPeriod(command: CatalogCommand<CatalogTransitionInput> & { readonly active: boolean }): Promise<ManagedAdmissionPeriod> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await this.lockCatalogReference(transaction, "admission-period", command.id);
      const current = await this.lockPeriod(transaction, command.id);
      this.assertVersion(current.updated_at, command.values.expectedUpdatedAt);
      if (current.is_active === command.active) throw new ConflictError("Kỳ tuyển sinh đã ở trạng thái yêu cầu.");
      if (command.active) {
        if (current.start_date === null || current.end_date === null) throw new ConflictError("Kỳ tuyển sinh chưa có đủ khoảng ngày.");
        await this.lockPeriodSchedule(transaction);
        await this.assertNoPeriodOverlap(transaction, command.id, current.start_date, current.end_date);
      } else {
        const activeLinks = await transaction.registration_links.count({ where: { admission_period_id: command.id, status: "ACTIVE" } });
        if (activeLinks > 0) throw new ConflictError("Không thể tạm dừng kỳ đang được liên kết ACTIVE sử dụng.");
      }
      const row = await transaction.admission_periods.update({ where: { id: command.id }, data: {
        is_active: command.active, updated_at: nextTimestamp(current.updated_at),
      }, select: periodSelect });
      await this.audit(transaction, command.actor, command.context, command.active ? "ADMISSION_PERIOD_ACTIVATED" : "ADMISSION_PERIOD_DEACTIVATED", "admission_periods", row.id, { status: command.active ? "INACTIVE" : "ACTIVE" }, { status: command.active ? "ACTIVE" : "INACTIVE" });
      return mapPeriod(row);
    }));
  }

  async createMajor(actor: AuthenticatedActor, values: CreateMajorInput, context: CatalogMutationContext): Promise<ManagedMajor> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      const now = new Date();
      const row = await transaction.majors.create({ data: {
        code: values.code, name: values.name, display_order: values.displayOrder,
        is_active: false, created_at: now, updated_at: now,
      }, select: majorSelect });
      await this.audit(transaction, actor, context, "MAJOR_CREATED", "majors", row.id, undefined, { status: "INACTIVE", displayOrder: values.displayOrder });
      return mapMajor(row);
    }));
  }

  async updateMajor(command: CatalogCommand<UpdateMajorInput>): Promise<ManagedMajor> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      const current = await this.lockMajor(transaction, command.id);
      this.assertVersion(current.updated_at, command.values.expectedUpdatedAt);
      const codeChanged = command.values.code !== undefined && command.values.code !== current.code;
      if (codeChanged && await this.majorReferenceCount(transaction, command.id) > 0) {
        throw new ConflictError("Ngành đã được tham chiếu; không thể đổi mã ngành.");
      }
      const changedFields = [
        codeChanged ? "code" : null,
        command.values.name !== undefined && command.values.name !== current.name ? "name" : null,
        command.values.displayOrder !== undefined && command.values.displayOrder !== current.display_order ? "displayOrder" : null,
      ].filter((value): value is string => value !== null);
      if (changedFields.length === 0) throw new ConflictError("Thông tin ngành học không thay đổi.");
      const row = await transaction.majors.update({ where: { id: command.id }, data: {
        ...(command.values.code === undefined ? {} : { code: command.values.code }),
        ...(command.values.name === undefined ? {} : { name: command.values.name }),
        ...(command.values.displayOrder === undefined ? {} : { display_order: command.values.displayOrder }),
        updated_at: nextTimestamp(current.updated_at),
      }, select: majorSelect });
      await this.audit(transaction, command.actor, command.context, "MAJOR_UPDATED", "majors", row.id, undefined, undefined, { changedFields });
      return mapMajor(row);
    }));
  }

  async transitionMajor(command: CatalogCommand<CatalogTransitionInput> & { readonly active: boolean }): Promise<ManagedMajor> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await this.lockCatalogReference(transaction, "major", command.id);
      const current = await this.lockMajor(transaction, command.id);
      this.assertVersion(current.updated_at, command.values.expectedUpdatedAt);
      if (current.is_active === command.active) throw new ConflictError("Ngành học đã ở trạng thái yêu cầu.");
      if (!command.active) {
        const activeLinks = await transaction.registration_links.count({ where: { major_id: command.id, status: "ACTIVE" } });
        if (activeLinks > 0) throw new ConflictError("Không thể tạm dừng ngành đang được liên kết ACTIVE sử dụng.");
      }
      const row = await transaction.majors.update({ where: { id: command.id }, data: {
        is_active: command.active, updated_at: nextTimestamp(current.updated_at),
      }, select: majorSelect });
      await this.audit(transaction, command.actor, command.context, command.active ? "MAJOR_ACTIVATED" : "MAJOR_DEACTIVATED", "majors", row.id, { status: command.active ? "INACTIVE" : "ACTIVE" }, { status: command.active ? "ACTIVE" : "INACTIVE" });
      return mapMajor(row);
    }));
  }

  private async lockPeriod(transaction: Prisma.TransactionClient, id: string): Promise<PeriodRow> {
    const rows = await transaction.$queryRaw<PeriodRow[]>`SELECT id, code, name, start_date, end_date, is_active, updated_at FROM admission_periods WHERE id=${id}::uuid FOR UPDATE`;
    if (rows[0] === undefined) throw new NotFoundError("Admission period");
    return rows[0];
  }
  private async lockMajor(transaction: Prisma.TransactionClient, id: string): Promise<MajorRow> {
    const rows = await transaction.$queryRaw<MajorRow[]>`SELECT id, code, name, display_order, is_active, updated_at FROM majors WHERE id=${id}::uuid FOR UPDATE`;
    if (rows[0] === undefined) throw new NotFoundError("Major");
    return rows[0];
  }
  private assertVersion(current: Date, expected: string): void {
    if (current.getTime() !== new Date(expected).getTime()) throw new ConflictError("Dữ liệu đã thay đổi. Vui lòng tải lại trang.");
  }
  private lockPeriodSchedule(transaction: Prisma.TransactionClient) {
    return transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('catalogs:admission-period-schedule'))::text`;
  }
  private lockCatalogReference(transaction: Prisma.TransactionClient, type: "admission-period" | "major", id: string) {
    return transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`catalogs:${type}:${id}`}))::text`;
  }
  private async assertNoPeriodOverlap(transaction: Prisma.TransactionClient, id: string, startDate: Date, endDate: Date): Promise<void> {
    const overlap = await transaction.admission_periods.findFirst({ where: {
      id: { not: id }, is_active: true,
      AND: [
        { OR: [{ start_date: null }, { start_date: { lte: endDate } }] },
        { OR: [{ end_date: null }, { end_date: { gte: startDate } }] },
      ],
    }, select: { id: true } });
    if (overlap !== null) throw new ConflictError("Khoảng ngày của kỳ tuyển sinh active bị chồng lấn.");
  }
  private async periodReferenceCount(transaction: Prisma.TransactionClient, id: string): Promise<number> {
    const [links, applications] = await Promise.all([
      transaction.registration_links.count({ where: { admission_period_id: id } }),
      transaction.applications.count({ where: { admission_period_id: id } }),
    ]);
    return links + applications;
  }
  private async majorReferenceCount(transaction: Prisma.TransactionClient, id: string): Promise<number> {
    const [links, applications] = await Promise.all([
      transaction.registration_links.count({ where: { major_id: id } }),
      transaction.applications.count({ where: { major_id: id } }),
    ]);
    return links + applications;
  }
  private audit(
    transaction: Prisma.TransactionClient,
    actor: AuthenticatedActor,
    context: CatalogMutationContext,
    action: string,
    entityType: "admission_periods" | "majors",
    entityId: string,
    oldValues?: Prisma.InputJsonValue,
    newValues?: Prisma.InputJsonValue,
    metadata?: Prisma.InputJsonValue,
  ) {
    return transaction.audit_logs.create({ data: {
      actor_id: actor.userId, action, entity_type: entityType, entity_id: entityId,
      old_values: oldValues, new_values: newValues,
      metadata: { result: "success", requestId: context.requestId, actorRole: actor.role, ...(metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}) },
    } });
  }
}
