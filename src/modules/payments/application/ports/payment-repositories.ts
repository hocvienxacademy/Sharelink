import type { AuthenticatedActor } from "@/shared/authorization";
import type { PaymentAuthorizationResource } from "../authorization/payment-authorization";
import type { PaymentHistory, PaymentMutationResult, StaffPaymentDetail, StaffPaymentListItem } from "../dto/payment-dto";

export type PaymentQueryScope =
  | { readonly kind: "all" }
  | { readonly kind: "sale"; readonly saleId: string }
  | { readonly kind: "manager"; readonly managerId: string };

export interface PaymentQueryRepository {
  findAuthorizationResourceByApplicationId(applicationId: string): Promise<PaymentAuthorizationResource | null>;
  findAuthorizationResourceByPaymentId(paymentId: string): Promise<PaymentAuthorizationResource | null>;
  findDetailByApplicationId(applicationId: string, scope: PaymentQueryScope): Promise<StaffPaymentDetail | null>;
  findDetailByPaymentId(paymentId: string, scope: PaymentQueryScope): Promise<StaffPaymentDetail | null>;
  findHistoryByApplicationId(applicationId: string, scope: PaymentQueryScope): Promise<PaymentHistory | null>;
  list(scope: PaymentQueryScope): Promise<readonly StaffPaymentListItem[]>;
}

interface PaymentMutationCommandBase {
  readonly actor: AuthenticatedActor;
  readonly applicationId: string;
  readonly expectedUpdatedAt: Date;
  readonly occurredAt: Date;
  readonly requestId: string;
}

export interface ConfirmPaymentCommand extends PaymentMutationCommandBase {
  readonly confirmationNote: string | null;
  readonly expectedStatus: "PENDING";
}

export interface CancelPaymentCommand extends PaymentMutationCommandBase {
  readonly expectedStatus: "CONFIRMED";
  readonly reason: string;
}

export interface PaymentMutationRepository {
  cancel(command: CancelPaymentCommand): Promise<PaymentMutationResult>;
  confirm(command: ConfirmPaymentCommand): Promise<PaymentMutationResult>;
}
