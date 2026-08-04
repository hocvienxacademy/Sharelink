import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";

const noHtml = (value: string) => !/<[^>]*>/u.test(value);
const optionalNote = z.union([z.string().trim().refine(noHtml, "Ghi chú chỉ được phép là văn bản thuần."), z.null()])
  .optional()
  .transform((value) => value === undefined || value === "" ? null : value);

const expectedUpdatedAt = z.iso.datetime({ offset: true });

export const confirmPaymentSchema = z.object({
  confirmationNote: optionalNote,
  expectedStatus: z.literal("PENDING"),
  expectedUpdatedAt,
}).strict();

export const cancelPaymentSchema = z.object({
  expectedStatus: z.literal("CONFIRMED"),
  expectedUpdatedAt,
  reason: z.string().trim().min(1).max(2000)
    .refine(noHtml, "Lý do hủy chỉ được phép là văn bản thuần."),
}).strict();

export const parseConfirmPayment = (input: unknown) => parseWithSchema(confirmPaymentSchema, input);
export const parseCancelPayment = (input: unknown) => parseWithSchema(cancelPaymentSchema, input);

