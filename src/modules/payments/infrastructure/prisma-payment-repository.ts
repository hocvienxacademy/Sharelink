import { z } from "zod";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { executePrismaOperation, prisma } from "@/shared/infrastructure/database/prisma";
import { maskSensitiveValue } from "@/shared/security/mask-sensitive-value";
import type { PaymentAuthorizationResource } from "../application/authorization/payment-authorization";
import type { PaymentHistory, PaymentMutationResult, StaffPaymentDetail, StaffPaymentListItem } from "../application/dto/payment-dto";
import type { CancelPaymentCommand, ConfirmPaymentCommand, PaymentMutationRepository, PaymentQueryRepository, PaymentQueryScope } from "../application/ports/payment-repositories";

const uuidSchema = z.uuid();

function applicationScope(scope: PaymentQueryScope) {
  if (scope.kind === "all") return {};
  if (scope.kind === "sale") return { sale_id: scope.saleId };
  return { users_applications_sale_idTousers: { manager_id: scope.managerId } };
}

const detailSelect = {
  id: true, application_id: true, status: true, amount: true, bank_name: true,
  account_number: true, account_name: true, transfer_content: true, confirmation_note: true,
  confirmed_at: true, cancelled_at: true, cancellation_reason: true, created_at: true, updated_at: true,
  users_payment_confirmations_confirmed_byTousers: { select: { full_name: true } },
  users_payment_confirmations_cancelled_byTousers: { select: { full_name: true } },
  applications: { select: {
    id: true, application_code: true, full_name: true, status: true,
    registration_links: { select: { tuition_amount: true } },
  } },
} as const;

type DetailRecord = NonNullable<Awaited<ReturnType<typeof findDetailRecord>>>;

function mapDetail(record: DetailRecord): StaffPaymentDetail {
  const tuition = record.applications.registration_links.tuition_amount;
  return {
    id: record.id,
    applicationId: record.application_id,
    applicationCode: record.applications.application_code,
    applicationStatus: record.applications.status,
    studentName: record.applications.full_name,
    status: record.status,
    amount: record.amount?.toString() ?? null,
    tuitionAmount: tuition?.toString() ?? null,
    amountMatchesTuition: record.amount !== null && tuition !== null && record.amount.equals(tuition),
    bankName: record.bank_name,
    maskedAccountNumber: maskSensitiveValue(record.account_number),
    accountName: record.account_name,
    transferContent: record.transfer_content,
    confirmationNote: record.confirmation_note,
    confirmedAt: record.confirmed_at,
    confirmerName: record.users_payment_confirmations_confirmed_byTousers?.full_name ?? null,
    cancelledAt: record.cancelled_at,
    cancellerName: record.users_payment_confirmations_cancelled_byTousers?.full_name ?? null,
    cancellationReason: record.cancellation_reason,
    createdAt: record.created_at,
    updatedAtIso: record.updated_at.toISOString(),
  };
}

async function findDetailRecord(paymentId: string | undefined, applicationId: string | undefined, scope: PaymentQueryScope) {
  return prisma.payment_confirmations.findFirst({
    where: {
      ...(paymentId === undefined ? {} : { id: paymentId }),
      ...(applicationId === undefined ? {} : { application_id: applicationId }),
      applications: applicationScope(scope),
    },
    select: detailSelect,
  });
}

export class PrismaPaymentRepository implements PaymentQueryRepository, PaymentMutationRepository {
  async list(scope: PaymentQueryScope): Promise<readonly StaffPaymentListItem[]> {
    const records = await executePrismaOperation(() => prisma.payment_confirmations.findMany({
      where: { applications: applicationScope(scope) },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true, status: true, amount: true, bank_name: true, created_at: true,
        applications: { select: {
          id: true, application_code: true, full_name: true, status: true,
          registration_links: { select: { tuition_amount: true } },
        } },
      },
    }));
    return records.map((record) => ({
      id: record.id,
      status: record.status,
      amount: record.amount?.toString() ?? null,
      bankName: record.bank_name,
      createdAt: record.created_at,
      applicationId: record.applications.id,
      applicationCode: record.applications.application_code,
      applicationStatus: record.applications.status,
      studentName: record.applications.full_name,
      tuitionAmount: record.applications.registration_links.tuition_amount?.toString() ?? null,
    }));
  }

  async findAuthorizationResourceByApplicationId(applicationId: string): Promise<PaymentAuthorizationResource | null> {
    if (!uuidSchema.safeParse(applicationId).success) return null;
    return this.findAuthorizationResource({ application_id: applicationId });
  }

  async findAuthorizationResourceByPaymentId(paymentId: string): Promise<PaymentAuthorizationResource | null> {
    if (!uuidSchema.safeParse(paymentId).success) return null;
    return this.findAuthorizationResource({ id: paymentId });
  }

  async findDetailByApplicationId(applicationId: string, scope: PaymentQueryScope): Promise<StaffPaymentDetail | null> {
    if (!uuidSchema.safeParse(applicationId).success) return null;
    const record = await executePrismaOperation(() => findDetailRecord(undefined, applicationId, scope));
    return record === null ? null : mapDetail(record);
  }

  async findDetailByPaymentId(paymentId: string, scope: PaymentQueryScope): Promise<StaffPaymentDetail | null> {
    if (!uuidSchema.safeParse(paymentId).success) return null;
    const record = await executePrismaOperation(() => findDetailRecord(paymentId, undefined, scope));
    return record === null ? null : mapDetail(record);
  }

  async findHistoryByApplicationId(applicationId: string, scope: PaymentQueryScope): Promise<PaymentHistory | null> {
    const detail = await this.findDetailByApplicationId(applicationId, scope);
    if (detail === null) return null;
    const history: PaymentHistory[number][] = [{
      id: `${detail.id}:pending`, previousStatus: null, newStatus: "PENDING",
      actorName: "Hệ thống", createdAt: detail.createdAt, reason: null,
    }];
    if (detail.confirmedAt !== null) history.push({
      id: `${detail.id}:confirmed`, previousStatus: "PENDING", newStatus: "CONFIRMED",
      actorName: detail.confirmerName ?? "Hệ thống", createdAt: detail.confirmedAt, reason: detail.confirmationNote,
    });
    if (detail.cancelledAt !== null) history.push({
      id: `${detail.id}:cancelled`, previousStatus: "CONFIRMED", newStatus: "CANCELLED",
      actorName: detail.cancellerName ?? "Hệ thống", createdAt: detail.cancelledAt, reason: detail.cancellationReason,
    });
    return history.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async confirm(command: ConfirmPaymentCommand): Promise<PaymentMutationResult> {
    return this.mutate("confirm", command);
  }

  async cancel(command: CancelPaymentCommand): Promise<PaymentMutationResult> {
    return this.mutate("cancel", command);
  }

  private async findAuthorizationResource(where: { readonly id?: string; readonly application_id?: string }): Promise<PaymentAuthorizationResource | null> {
    const record = await executePrismaOperation(() => prisma.payment_confirmations.findFirst({
      where,
      select: { status: true, applications: { select: {
        status: true, sale_id: true,
        users_applications_sale_idTousers: { select: { manager_id: true } },
      } } },
    }));
    return record === null ? null : {
      applicationStatus: record.applications.status,
      ownerId: record.applications.sale_id,
      ownerManagerId: record.applications.users_applications_sale_idTousers.manager_id,
      paymentStatus: record.status,
    };
  }

  private async mutate(action: "confirm", command: ConfirmPaymentCommand): Promise<PaymentMutationResult>;
  private async mutate(action: "cancel", command: CancelPaymentCommand): Promise<PaymentMutationResult>;
  private async mutate(action: "confirm" | "cancel", command: ConfirmPaymentCommand | CancelPaymentCommand): Promise<PaymentMutationResult> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM payment_confirmations WHERE application_id = ${command.applicationId}::uuid FOR UPDATE`;
      const current = await transaction.payment_confirmations.findUnique({
        where: { application_id: command.applicationId },
        select: {
          id: true, application_id: true, status: true, amount: true, updated_at: true,
          applications: { select: {
            status: true, sale_id: true,
            registration_links: { select: { tuition_amount: true } },
            users_applications_sale_idTousers: { select: { manager_id: true } },
          } },
        },
      });
      if (current === null) throw new NotFoundError("Payment confirmation");
      this.assertMutationScope(command.actor, current.applications.sale_id, current.applications.users_applications_sale_idTousers.manager_id);
      if (current.applications.status !== "VALID") throw new ConflictError("Chỉ hồ sơ hợp lệ mới được thao tác thanh toán.");
      if (current.status !== command.expectedStatus || current.updated_at.getTime() !== command.expectedUpdatedAt.getTime()) {
        throw new ConflictError("Thanh toán đã được thay đổi. Vui lòng tải lại dữ liệu.");
      }
      if (action === "confirm") {
        const tuition = current.applications.registration_links.tuition_amount;
        if (current.amount === null || tuition === null || !current.amount.equals(tuition)) {
          throw new ConflictError("Số tiền thanh toán chưa được cấu hình hoặc không khớp học phí.");
        }
      }
      const updated = action === "confirm"
        ? await transaction.payment_confirmations.update({
            where: { id: current.id },
            data: {
              status: "CONFIRMED", confirmed_by: command.actor.userId, confirmed_at: command.occurredAt,
              confirmation_note: (command as ConfirmPaymentCommand).confirmationNote, updated_at: command.occurredAt,
            },
            select: { status: true, updated_at: true },
          })
        : await transaction.payment_confirmations.update({
            where: { id: current.id },
            data: {
              status: "CANCELLED", cancelled_by: command.actor.userId, cancelled_at: command.occurredAt,
              cancellation_reason: (command as CancelPaymentCommand).reason, updated_at: command.occurredAt,
            },
            select: { status: true, updated_at: true },
          });
      await transaction.audit_logs.create({ data: {
        actor_id: command.actor.userId,
        action: action === "confirm" ? "PAYMENT_CONFIRMED" : "PAYMENT_CONFIRMATION_CANCELLED",
        entity_type: "payment_confirmations",
        entity_id: current.id,
        old_values: { status: current.status },
        new_values: { status: updated.status },
        metadata: {
          actorRole: command.actor.role,
          applicationId: current.application_id,
          changedFields: action === "confirm"
            ? ["status", "confirmedBy", "confirmedAt", "confirmationNote"]
            : ["status", "cancelledBy", "cancelledAt", "cancellationReason"],
          requestId: command.requestId,
          transition: `${current.status}->${updated.status}`,
        },
      } });
      return { id: current.id, applicationId: current.application_id, status: updated.status, updatedAt: updated.updated_at };
    }));
  }

  private assertMutationScope(actor: AuthenticatedActor, ownerId: string, ownerManagerId: string | null): void {
    if (actor.role === "ADMIN" || (actor.role === "MANAGER" && ownerManagerId === actor.userId)) return;
    throw new ForbiddenError();
  }
}

