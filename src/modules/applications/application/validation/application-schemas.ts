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
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Ngày không hợp lệ.");

export const applicationRelativeInputSchema = z
  .object({
    position: z
      .int("Vị trí người thân không hợp lệ.")
      .min(1, "Vị trí người thân phải từ 1 đến 2.")
      .max(2, "Vị trí người thân phải từ 1 đến 2."),
    fullName: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.relativeFullName),
    relationship: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.relativeRelationship),
    occupation: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.relativeOccupation),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9]{10,15}$/, "Số điện thoại người thân phải gồm từ 10 đến 15 chữ số.")
      .nullable()
      .optional(),
    address: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.relativeAddress),
  })
  .strict();

const relativesSchema = z
  .array(applicationRelativeInputSchema)
  .max(2, "Chỉ được cung cấp tối đa hai người thân.")
  .superRefine((relatives, context) => {
    const positions = new Set<number>();

    relatives.forEach((relative, index) => {
      if (positions.has(relative.position)) {
        context.addIssue({
          code: "custom",
          path: [index, "position"],
          message: "Vị trí người thân không được trùng nhau.",
        });
      }

      positions.add(relative.position);
    });
  });

const draftFields = {
  majorId: z.uuid("Ngành đăng ký không hợp lệ.").nullable().optional(),
  entryQualification: z
    .enum(ADMISSION_QUALIFICATIONS, "Đối tượng đầu vào không hợp lệ.")
    .nullable()
    .optional(),
  fullName: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.fullName),
  gender: z.enum(GENDERS, "Giới tính không hợp lệ.").nullable().optional(),
  dateOfBirth: dateOnlySchema.nullable().optional(),
  placeOfBirth: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.placeOfBirth),
  ethnicity: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.ethnicity),
  religion: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.religion),
  nationality: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.nationality),
  citizenId: z
    .string()
    .trim()
    .regex(/^[0-9]{9,12}$/, "Số giấy tờ định danh phải gồm từ 9 đến 12 chữ số.")
    .nullable()
    .optional(),
  citizenIdIssuedDate: dateOnlySchema.nullable().optional(),
  citizenIdIssuedPlace: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.citizenIdIssuedPlace),
  permanentAddress: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.permanentAddress),
  workplace: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.workplace),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Số điện thoại phải gồm đúng 10 chữ số.")
    .nullable()
    .optional(),
  email: z
    .string()
    .trim()
    .pipe(
      z
        .email("Email không đúng định dạng.")
        .max(
          WORD_EXPORT_TEXT_LIMITS.email,
          "Email không được vượt quá " +
            WORD_EXPORT_TEXT_LIMITS.email +
            " ký tự.",
        ),
    )
    .nullable()
    .optional(),
  contactAddress: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.contactAddress),
  admissionDiploma: z
    .enum(ADMISSION_QUALIFICATIONS, "Bằng đăng ký xét tuyển không hợp lệ.")
    .nullable()
    .optional(),
  graduateMajor: optionalNullableString(WORD_EXPORT_TEXT_LIMITS.graduateMajor),
  graduationYear: z
    .int("Năm tốt nghiệp không hợp lệ.")
    .min(1950, "Năm tốt nghiệp phải từ 1950 đến 2100.")
    .max(2100, "Năm tốt nghiệp phải từ 1950 đến 2100.")
    .nullable()
    .optional(),
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
    expectedVersion: z.int("Phiên bản hồ sơ không hợp lệ.").min(1, "Phiên bản hồ sơ không hợp lệ."),
  })
  .strict();

export const submitApplicationSchema = z
  .object({
    expectedVersion: z.int("Phiên bản hồ sơ không hợp lệ.").min(1, "Phiên bản hồ sơ không hợp lệ."),
  })
  .strict();

export const applicationIdentifierSchema = z.uuid("Mã hồ sơ không hợp lệ.");

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
