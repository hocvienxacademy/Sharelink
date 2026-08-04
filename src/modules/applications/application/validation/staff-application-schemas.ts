import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";
import { updateDraftApplicationSchema } from "./application-schemas";

const noHtml = (value: string) => !/<[^>]*>/u.test(value);
export const revisionReasonSchema = z.string().trim().min(1).max(2000)
  .refine(noHtml, "Nội dung yêu cầu bổ sung chỉ được phép là văn bản thuần.");
export const staffUpdateApplicationSchema = updateDraftApplicationSchema.strict().refine(
  (value) => Object.keys(value).some((key) => key !== "expectedVersion"),
  "Cần cung cấp ít nhất một trường nội dung cần cập nhật.",
);
export const staffReviewApplicationSchema = z.object({
  expectedVersion: z.int().min(1),
  expectedStatus: z.literal("SUBMITTED"),
}).strict();
export const requestRevisionSchema = staffReviewApplicationSchema.extend({
  reason: revisionReasonSchema,
}).strict();

export const parseStaffUpdateApplication = (input: unknown) => parseWithSchema(staffUpdateApplicationSchema, input);
export const parseStaffReviewApplication = (input: unknown) => parseWithSchema(staffReviewApplicationSchema, input);
export const parseRequestRevision = (input: unknown) => parseWithSchema(requestRevisionSchema, input);
