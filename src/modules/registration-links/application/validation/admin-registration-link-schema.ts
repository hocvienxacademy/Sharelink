import { z } from "zod";
import { ADMISSION_QUALIFICATIONS } from "@/shared/domain";
import { parseWithSchema } from "@/shared/validation";
import { REGISTRATION_LINK_STATUSES } from "../../domain/registration-link";

const nullableText = (maximum: number) =>
  z.string().trim().max(maximum).nullable().transform((value) => value === "" ? null : value);

const nullableUuid = z.union([z.uuid(), z.literal(""), z.null()])
  .transform((value) => value === "" ? null : value);

const nullableExpiry = z.union([z.iso.datetime({ offset: true }), z.literal(""), z.null()])
  .transform((value) => value === "" ? null : value);

export const adminRegistrationLinkFieldsSchema = z.object({
  saleId: z.uuid("SALE không hợp lệ.").optional(),
  majorId: nullableUuid,
  studentNameHint: nullableText(150),
  entryQualification: z.union([z.enum(ADMISSION_QUALIFICATIONS), z.literal(""), z.null()])
    .transform((value) => value === "" ? null : value),
  paymentRound: nullableText(50),
  internalNote: nullableText(2_000),
  expiresAt: nullableExpiry,
}).strict();

export type AdminRegistrationLinkFields = z.infer<typeof adminRegistrationLinkFieldsSchema>;
export const updateAdminRegistrationLinkFieldsSchema = adminRegistrationLinkFieldsSchema.omit({ saleId: true }).extend({
  expectedStatus: z.literal("DRAFT"),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});
export type UpdateAdminRegistrationLinkFields = z.infer<typeof updateAdminRegistrationLinkFieldsSchema>;

export function parseAdminRegistrationLinkFields(input: unknown): AdminRegistrationLinkFields {
  return parseWithSchema(adminRegistrationLinkFieldsSchema, input);
}

export function parseUpdateAdminRegistrationLinkFields(input: unknown): UpdateAdminRegistrationLinkFields {
  return parseWithSchema(updateAdminRegistrationLinkFieldsSchema, input);
}

const transitionInputSchema = z.object({
  expectedStatus: z.enum(REGISTRATION_LINK_STATUSES),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  reason: nullableText(500).optional().default(null),
}).strict();

export function parseRegistrationLinkTransitionInput(input: unknown): z.infer<typeof transitionInputSchema> {
  return parseWithSchema(transitionInputSchema, input ?? {});
}
