import { z } from "zod";
import {
  ADMISSION_QUALIFICATIONS,
} from "../../../../shared/domain/index";
import { parseWithSchema } from "../../../../shared/validation/index";
import { GENDERS } from "../../domain/application";

function optionalNullableString(maxLength: number) {
  return z.string().trim().max(maxLength).nullable().optional();
}

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date format YYYY-MM-DD.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Expected a valid calendar date.");

export const applicationRelativeInputSchema = z
  .object({
    position: z.int().min(1).max(2),
    fullName: optionalNullableString(150),
    relationship: optionalNullableString(100),
    occupation: optionalNullableString(255),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9]{10,15}$/)
      .nullable()
      .optional(),
    address: z.string().trim().nullable().optional(),
  })
  .strict();

const relativesSchema = z
  .array(applicationRelativeInputSchema)
  .max(2)
  .superRefine((relatives, context) => {
    const positions = new Set<number>();

    relatives.forEach((relative, index) => {
      if (positions.has(relative.position)) {
        context.addIssue({
          code: "custom",
          path: [index, "position"],
          message: "Relative positions must be unique.",
        });
      }

      positions.add(relative.position);
    });
  });

const draftFields = {
  majorId: z.uuid().nullable().optional(),
  entryQualification: z.enum(ADMISSION_QUALIFICATIONS).nullable().optional(),
  fullName: optionalNullableString(150),
  gender: z.enum(GENDERS).nullable().optional(),
  dateOfBirth: dateOnlySchema.nullable().optional(),
  placeOfBirth: optionalNullableString(255),
  ethnicity: optionalNullableString(100),
  religion: optionalNullableString(100),
  nationality: optionalNullableString(100),
  citizenId: z
    .string()
    .trim()
    .regex(/^[0-9]{9,12}$/)
    .nullable()
    .optional(),
  citizenIdIssuedDate: dateOnlySchema.nullable().optional(),
  citizenIdIssuedPlace: optionalNullableString(255),
  permanentAddress: z.string().trim().nullable().optional(),
  workplace: z.string().trim().nullable().optional(),
  phone: z.string().trim().regex(/^[0-9]{10}$/).nullable().optional(),
  email: z
    .string()
    .trim()
    .pipe(z.email().max(255))
    .nullable()
    .optional(),
  contactAddress: z.string().trim().nullable().optional(),
  admissionDiploma: z
    .enum(ADMISSION_QUALIFICATIONS)
    .nullable()
    .optional(),
  graduateMajor: optionalNullableString(255),
  graduationYear: z.int().min(1950).max(2100).nullable().optional(),
  highSchoolName: optionalNullableString(255),
  highSchoolWard: optionalNullableString(255),
  highSchoolProvince: optionalNullableString(255),
  declarationPlace: optionalNullableString(255),
  declarationDate: dateOnlySchema.nullable().optional(),
  declarationConfirmed: z.boolean().optional(),
  dataProcessingConsent: z.boolean().optional(),
} as const;

export const createDraftApplicationSchema = z
  .object({
    ...draftFields,
    relatives: relativesSchema.optional(),
  })
  .strict();

export const updateDraftApplicationSchema = z
  .object({
    ...draftFields,
    relatives: relativesSchema.optional(),
    expectedVersion: z.int().min(1),
  })
  .strict();

export const submitApplicationSchema = z
  .object({
    expectedVersion: z.int().min(1),
  })
  .strict();

export const applicationIdentifierSchema = z.uuid();

export type CreateDraftApplicationInput = z.infer<
  typeof createDraftApplicationSchema
>;
export type UpdateDraftApplicationInput = z.infer<
  typeof updateDraftApplicationSchema
>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type ApplicationRelativeInput = z.infer<
  typeof applicationRelativeInputSchema
>;

export function parseCreateDraftApplicationInput(
  input: unknown,
): CreateDraftApplicationInput {
  return parseWithSchema(createDraftApplicationSchema, input);
}

export function parseUpdateDraftApplicationInput(
  input: unknown,
): UpdateDraftApplicationInput {
  return parseWithSchema(updateDraftApplicationSchema, input);
}

export function parseSubmitApplicationInput(
  input: unknown,
): SubmitApplicationInput {
  return parseWithSchema(submitApplicationSchema, input);
}

export function parseApplicationIdentifier(input: unknown): string {
  return parseWithSchema(applicationIdentifierSchema, input);
}
