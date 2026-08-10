import { z } from "zod";
import {
  ADMISSION_QUALIFICATIONS,
} from "../../../../shared/domain/index";
import { parseWithSchema } from "../../../../shared/validation/index";
import { GENDERS } from "../../domain/application";

export const WORD_EXPORT_TEXT_LIMITS = {
  fullName: 50,
  placeOfBirth: 50,
  ethnicity: 20,
  religion: 20,
  nationality: 20,
  citizenIdIssuedPlace: 80,
  permanentAddress: 80,
  workplace: 60,
  contactAddress: 80,
  email: 60,
  majorName: 80,
  graduateMajor: 60,
  highSchoolName: 80,
  highSchoolWard: 40,
  highSchoolProvince: 40,
  declarationPlace: 30,
  relativeFullName: 40,
  relativeRelationship: 15,
  relativeOccupation: 30,
  relativeAddress: 50,
} as const;

function optionalNullableString(maxLength: number) {
  return z
    .string()
    .trim()
    .refine((value) => !/[\r\n]/u.test(value), "Nội dung phải nằm trên một dòng để bảo đảm phiếu Word nằm trên một trang.")
    .max(maxLength, `Nội dung không được vượt quá ${maxLength} ký tự để bảo đảm phiếu Word nằm trên một trang.`)
    .nullable()
    .optional();
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
    fullName: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.relativeFullName),
    relationship: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.relativeRelationship),
    occupation: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.relativeOccupation),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9]{10,15}$/)
      .nullable()
      .optional(),
    address: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.relativeAddress),
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
  fullName: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.fullName),
  gender: z.enum(GENDERS).nullable().optional(),
  dateOfBirth: dateOnlySchema.nullable().optional(),
  placeOfBirth: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.placeOfBirth),
  ethnicity: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.ethnicity),
  religion: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.religion),
  nationality: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.nationality),
  citizenId: z
    .string()
    .trim()
    .regex(/^[0-9]{9,12}$/)
    .nullable()
    .optional(),
  citizenIdIssuedDate: dateOnlySchema.nullable().optional(),
  citizenIdIssuedPlace: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.citizenIdIssuedPlace),
  permanentAddress: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.permanentAddress),
  workplace: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.workplace),
  phone: z.string().trim().regex(/^[0-9]{10}$/).nullable().optional(),
  email: z
    .string()
    .trim()
    .pipe(z.email().max(WORD_EXPORT_TEXT_LIMITS.email))
    .nullable()
    .optional(),
  contactAddress: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.contactAddress),
  admissionDiploma: z
    .enum(ADMISSION_QUALIFICATIONS)
    .nullable()
    .optional(),
  graduateMajor: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.graduateMajor),
  graduationYear: z.int().min(1950).max(2100).nullable().optional(),
  highSchoolName: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.highSchoolName),
  highSchoolWard: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.highSchoolWard),
  highSchoolProvince: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.highSchoolProvince),
  declarationPlace: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.declarationPlace),
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
