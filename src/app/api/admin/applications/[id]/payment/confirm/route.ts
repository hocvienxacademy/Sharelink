import { paymentAdministration } from "@/composition/payments";
import { createPaymentMutationHandler } from "@/modules/payments/presentation/http/payment-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createPaymentMutationHandler(paymentAdministration.confirm.bind(paymentAdministration), "payment-confirm");

