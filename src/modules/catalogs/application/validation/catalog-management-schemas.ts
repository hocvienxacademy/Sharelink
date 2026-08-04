import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";

const code = z.string().trim().min(1).max(50);
const name = z.string().trim().min(1).max(255);
const dateOnly = z.iso.date();
const expectedUpdatedAt = z.iso.datetime({ offset: true });

export const createAdmissionPeriodSchema = z.object({
  code,
  name,
  startDate: dateOnly,
  endDate: dateOnly,
}).strict().superRefine((value, context) => {
  if (value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "Ngày kết thúc không được trước ngày bắt đầu." });
  }
});

export const updateAdmissionPeriodSchema = z.object({
  expectedUpdatedAt,
  code: code.optional(),
  name: name.optional(),
  startDate: dateOnly.optional(),
  endDate: dateOnly.optional(),
}).strict().superRefine((value, context) => {
  const changed = value.code !== undefined || value.name !== undefined || value.startDate !== undefined || value.endDate !== undefined;
  if (!changed) context.addIssue({ code: "custom", message: "Cần cung cấp ít nhất một trường cần cập nhật." });
  if ((value.startDate === undefined) !== (value.endDate === undefined)) {
    context.addIssue({ code: "custom", path: ["startDate"], message: "Cần cung cấp đồng thời ngày bắt đầu và ngày kết thúc." });
  }
  if (value.startDate !== undefined && value.endDate !== undefined && value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "Ngày kết thúc không được trước ngày bắt đầu." });
  }
});

export const createMajorSchema = z.object({
  code: code.transform((value) => value.toUpperCase()),
  name,
  displayOrder: z.number().int().nonnegative(),
}).strict();

export const updateMajorSchema = z.object({
  expectedUpdatedAt,
  code: code.transform((value) => value.toUpperCase()).optional(),
  name: name.optional(),
  displayOrder: z.number().int().nonnegative().optional(),
}).strict().superRefine((value, context) => {
  if (value.code === undefined && value.name === undefined && value.displayOrder === undefined) {
    context.addIssue({ code: "custom", message: "Cần cung cấp ít nhất một trường cần cập nhật." });
  }
});

export const catalogTransitionSchema = z.object({ expectedUpdatedAt }).strict();

export type CreateAdmissionPeriodInput = z.infer<typeof createAdmissionPeriodSchema>;
export type UpdateAdmissionPeriodInput = z.infer<typeof updateAdmissionPeriodSchema>;
export type CreateMajorInput = z.infer<typeof createMajorSchema>;
export type UpdateMajorInput = z.infer<typeof updateMajorSchema>;
export type CatalogTransitionInput = z.infer<typeof catalogTransitionSchema>;

export const parseCreateAdmissionPeriod = (input: unknown) => parseWithSchema(createAdmissionPeriodSchema, input);
export const parseUpdateAdmissionPeriod = (input: unknown) => parseWithSchema(updateAdmissionPeriodSchema, input);
export const parseCreateMajor = (input: unknown) => parseWithSchema(createMajorSchema, input);
export const parseUpdateMajor = (input: unknown) => parseWithSchema(updateMajorSchema, input);
export const parseCatalogTransition = (input: unknown) => parseWithSchema(catalogTransitionSchema, input);
