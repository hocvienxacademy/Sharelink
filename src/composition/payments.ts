import { PaymentAdministration, PrismaPaymentRepository, QueryPayments } from "@/modules/payments";

export const paymentRepository = new PrismaPaymentRepository();
export const paymentQueries = new QueryPayments(paymentRepository);
export const paymentAdministration = new PaymentAdministration(paymentRepository, paymentRepository);

