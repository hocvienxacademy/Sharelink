import type { ApplicationStatus } from "@/modules/applications";
import type { PaymentStatus } from "../../domain/payment";

export interface StaffPaymentListItem {
  readonly amount: string | null;
  readonly applicationCode: string | null;
  readonly applicationId: string;
  readonly applicationStatus: ApplicationStatus;
  readonly bankName: string;
  readonly createdAt: Date;
  readonly id: string;
  readonly status: PaymentStatus;
  readonly studentName: string | null;
  readonly tuitionAmount: string | null;
}

export interface StaffPaymentDetail extends StaffPaymentListItem {
  readonly accountName: string;
  readonly amountMatchesTuition: boolean;
  readonly cancellationReason: string | null;
  readonly cancelledAt: Date | null;
  readonly cancellerName: string | null;
  readonly confirmationNote: string | null;
  readonly confirmedAt: Date | null;
  readonly confirmerName: string | null;
  readonly maskedAccountNumber: string;
  readonly transferContent: string;
  readonly updatedAtIso: string;
}

export interface PaymentHistoryItem {
  readonly actorName: string;
  readonly createdAt: Date;
  readonly id: string;
  readonly newStatus: PaymentStatus;
  readonly previousStatus: PaymentStatus | null;
  readonly reason: string | null;
}

export type PaymentHistory = readonly PaymentHistoryItem[];

export interface PaymentMutationResult {
  readonly applicationId: string;
  readonly id: string;
  readonly status: PaymentStatus;
  readonly updatedAt: Date;
}

