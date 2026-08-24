import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { executePrismaOperation, prisma } from "@/shared/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  AdminRegistrationLinkRepository,
  CreateRegistrationLinkCommand,
  RegistrationLinkMutationResult,
  TransitionRegistrationLinkCommand,
  UpdateRegistrationLinkCommand,
} from "../application/ports/admin-registration-link-repository";
import {
  isRegistrationLinkMutationOwner,
  type RegistrationLinkAuthorizationResource,
} from "../application/authorization/registration-link-authorization";
import {
  assertRegistrationLinkTransition,
  registrationLinkTransitionTarget,
  type RegistrationLinkTransitionAction,
} from "../domain/registration-link-transitions";

const auditActionByTransition: Record<RegistrationLinkTransitionAction, string> = {
  activate: "REGISTRATION_LINK_ACTIVATED",
  lock: "REGISTRATION_LINK_LOCKED",
  unlock: "REGISTRATION_LINK_UNLOCKED",
  cancel: "REGISTRATION_LINK_CANCELLED",
  archive: "REGISTRATION_LINK_ARCHIVED",
};

export class PrismaAdminRegistrationLinkRepository implements AdminRegistrationLinkRepository {
  async findAuthorizationResource(id: string): Promise<RegistrationLinkAuthorizationResource | null> {
    const record = await executePrismaOperation(() => prisma.registration_links.findUnique({
      where: { id },
      select: {
        sale_id: true,
        status: true,
        users_registration_links_sale_idTousers: { select: { manager_id: true } },
      },
    }));
    return record === null ? null : {
      ownerId: record.sale_id,
      ownerManagerId: record.users_registration_links_sale_idTousers.manager_id,
      status: record.status,
    };
  }

  async create(command: CreateRegistrationLinkCommand): Promise<RegistrationLinkMutationResult> {
    const { actor, context, fields } = command;
    const now = new Date();
    const expiresAt = fields.expiresAt === null ? null : new Date(fields.expiresAt);
    if (expiresAt !== null && expiresAt <= now) {
      throw new ConflictError("Thời hạn liên kết phải ở tương lai.");
    }

    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await this.assertReferences(transaction, fields.saleId, fields.majorId);
      const link = await transaction.registration_links.create({
        data: {
          sale_id: fields.saleId,
          created_by: actor.userId,
          major_id: fields.majorId,
          student_name_hint: fields.studentNameHint,
          entry_qualification: fields.entryQualification,
          payment_round: fields.paymentRound,
          internal_note: fields.internalNote,
          expires_at: expiresAt,
          status: "DRAFT",
          updated_at: now,
        },
        select: { id: true, status: true, updated_at: true },
      });
      await transaction.registration_link_status_histories.create({
        data: { registration_link_id: link.id, new_status: "DRAFT", changed_by: actor.userId },
      });
      await transaction.audit_logs.create({
        data: {
          actor_id: actor.userId,
          action: "REGISTRATION_LINK_CREATED",
          entity_type: "registration_links",
          entity_id: link.id,
          new_values: { status: "DRAFT" },
          metadata: { result: "success", requestId: context.requestId },
        },
      });
      return {
        id: link.id,
        status: link.status,
        updatedAt: link.updated_at,
      };
    }));
  }

  async updateDetails(command: UpdateRegistrationLinkCommand): Promise<RegistrationLinkMutationResult> {
    const { actor, context, fields, id } = command;
    const now = new Date();
    const expiresAt = fields.expiresAt === null ? null : new Date(fields.expiresAt);
    if (expiresAt !== null && expiresAt <= now) {
      throw new ConflictError("Thời hạn liên kết phải ở tương lai.");
    }

    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM registration_links WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await transaction.registration_links.findUnique({
        where: { id },
        select: {
          id: true, sale_id: true, status: true, updated_at: true,
          applications: { select: { id: true } },
        },
      });
      if (current === null) throw new NotFoundError("Registration link");
      this.assertMutationScope(actor, current.sale_id);
      this.assertExpectedVersion(current.status, current.updated_at, command.expectedStatus, command.expectedUpdatedAt);
      if (current.status !== "DRAFT" || current.applications !== null) {
        throw new ConflictError("Chỉ có thể sửa liên kết nháp chưa có hồ sơ.");
      }
      await this.assertReferences(transaction, current.sale_id, fields.majorId);
      const updated = await transaction.registration_links.update({
        where: { id },
        data: {
          major_id: fields.majorId,
          student_name_hint: fields.studentNameHint,
          entry_qualification: fields.entryQualification,
          payment_round: fields.paymentRound,
          internal_note: fields.internalNote,
          expires_at: expiresAt,
          updated_at: now,
        },
        select: { status: true, updated_at: true },
      });
      await transaction.audit_logs.create({
        data: {
          actor_id: actor.userId,
          action: "REGISTRATION_LINK_UPDATED",
          entity_type: "registration_links",
          entity_id: id,
          metadata: { result: "success", requestId: context.requestId, changedFields: Object.keys(fields) },
        },
      });
      return { id, status: updated.status, updatedAt: updated.updated_at };
    }));
  }

  async transition(command: TransitionRegistrationLinkCommand): Promise<RegistrationLinkMutationResult> {
    const { action, actor, context, id, reason } = command;
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM registration_links WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await transaction.registration_links.findUnique({
        where: { id },
        select: {
          id: true, status: true, updated_at: true, expires_at: true,
          major_id: true, sale_id: true,
          applications: { select: { id: true } },
        },
      });
      if (current === null) throw new NotFoundError("Registration link");
      this.assertMutationScope(actor, current.sale_id);
      this.assertExpectedVersion(current.status, current.updated_at, command.expectedStatus, command.expectedUpdatedAt);
      const now = new Date();
      assertRegistrationLinkTransition(action, {
        status: current.status,
        expiresAt: current.expires_at,
        applicationId: current.applications?.id ?? null,
        now,
      });
      if (action === "activate") {
        await this.lockCatalogReferences(transaction, current.major_id);
        await this.assertReferences(transaction, current.sale_id, current.major_id);
      }
      const target = registrationLinkTransitionTarget(action);
      const updated = await transaction.registration_links.update({
        where: { id },
        data: {
          status: target,
          updated_at: now,
          ...(action === "activate" ? { activated_at: now, locked_at: null, locked_by: null } : {}),
          ...(action === "lock" ? { locked_at: now, locked_by: actor.userId } : {}),
          ...(action === "unlock" ? { locked_at: null, locked_by: null } : {}),
        },
        select: { status: true, updated_at: true },
      });
      await transaction.registration_link_status_histories.create({
        data: {
          registration_link_id: id,
          previous_status: current.status,
          new_status: target,
          changed_by: actor.userId,
          reason,
        },
      });
      await transaction.audit_logs.create({
        data: {
          actor_id: actor.userId,
          action: auditActionByTransition[action],
          entity_type: "registration_links",
          entity_id: id,
          old_values: { status: current.status },
          new_values: { status: target },
          metadata: { result: "success", requestId: context.requestId },
        },
      });
      return { id, status: updated.status, updatedAt: updated.updated_at };
    }));
  }

  private assertMutationScope(actor: CreateRegistrationLinkCommand["actor"], ownerId: string): void {
    if (!isRegistrationLinkMutationOwner(actor, ownerId)) {
      throw new ForbiddenError();
    }
  }

  private assertExpectedVersion(
    status: string,
    updatedAt: Date,
    expectedStatus: string,
    expectedUpdatedAt: Date,
  ): void {
    if (status !== expectedStatus || updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new ConflictError("Liên kết đã được thay đổi. Vui lòng tải lại trang trước khi tiếp tục.");
    }
  }

  private async assertReferences(
    transaction: Prisma.TransactionClient,
    saleId: string,
    majorId: string | null,
  ): Promise<void> {
    const [sale, major] = await Promise.all([
      transaction.users.findFirst({ where: { id: saleId, role: "SALE", is_active: true }, select: { id: true } }),
      majorId === null ? null : transaction.majors.findFirst({ where: { id: majorId, is_active: true }, select: { id: true } }),
    ]);
    if (sale === null) throw new ConflictError("SALE được chọn không còn hoạt động.");
    if (majorId !== null && major === null) throw new ConflictError("Ngành học không hợp lệ.");
  }

  private async lockCatalogReferences(
    transaction: Prisma.TransactionClient,
    majorId: string | null,
  ): Promise<void> {
    if (majorId !== null) {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`catalogs:major:${majorId}`}))::text`;
    }
  }

}
