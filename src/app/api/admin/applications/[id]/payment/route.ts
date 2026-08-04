import { paymentQueries } from "@/composition/payments";
import { createPaymentQueryHandler } from "@/modules/payments/presentation/http/payment-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createPaymentQueryHandler(paymentQueries.detailByApplicationId.bind(paymentQueries), "payment-detail");

