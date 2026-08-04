import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HTML_TAG = /<\/?[a-z][^>]*>/i;
const MARKDOWN = /(^|\n)\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|~~~|(?:[-*_]\s*){3,}$|\|.+\||(?:=|-){3,}\s*$)|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|(?:^|\s)(?:\*\*|__|~~|`)|[*_][^*\n]+[*_]/m;

export const paymentInstructionsMessageSchema = z.string()
  .trim()
  .min(1, "Hướng dẫn thanh toán không được để trống.")
  .max(2_000, "Hướng dẫn thanh toán không được vượt quá 2000 ký tự.")
  .refine((value) => !CONTROL_CHARACTERS.test(value), "Hướng dẫn chứa ký tự điều khiển không hợp lệ.")
  .refine((value) => !HTML_TAG.test(value), "Hướng dẫn chỉ chấp nhận văn bản thuần, không chấp nhận HTML.")
  .refine((value) => !MARKDOWN.test(value), "Hướng dẫn chỉ chấp nhận văn bản thuần, không chấp nhận Markdown.");

export const updatePaymentInstructionsSchema = z.object({
  message: paymentInstructionsMessageSchema,
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
}).strict();

export type UpdatePaymentInstructionsInput = z.infer<typeof updatePaymentInstructionsSchema>;
export const parseUpdatePaymentInstructions = (input: unknown): UpdatePaymentInstructionsInput =>
  parseWithSchema(updatePaymentInstructionsSchema, input);
