import { z } from "zod";
import {
  ApiRequestError,
  requestJson,
  type ApiErrorKind,
  type ApiValidationIssue,
  type JsonApiMethod,
} from "@/shared/http/browser/json-api-client";
import { ADMISSION_QUALIFICATIONS } from "../../../../shared/domain/index";
import {
  APPLICATION_STATUSES,
  GENDERS,
  SUBMISSION_EMAIL_STATUSES,
} from "../../domain/application";
import {
  createDraftApplicationSchema,
  type CreateDraftApplicationInput,
  type UpdateDraftApplicationInput,
} from "../../application/validation/application-schemas";
import { REGISTRATION_LINK_STATUSES } from "../../../registration-links/domain/registration-link";

const registrationContextSchema = z.object({
  status: z.enum(REGISTRATION_LINK_STATUSES),
  majors: z.array(
    z.object({
      id: z.uuid(),
      code: z.string(),
      name: z.string(),
    }),
  ),
  majorId: z.uuid().nullable(),
  studentNameHint: z.string().nullable(),
  entryQualification: z.enum(ADMISSION_QUALIFICATIONS).nullable(),
  hasApplication: z.boolean(),
  application: z
    .object({
      id: z.uuid(),
      status: z.string(),
    })
    .nullable(),
  payment: z.object({
    account: z
      .object({
        bankCode: z.string(),
        bankName: z.string(),
        branchName: z.string().nullable(),
        accountNumber: z.string(),
        accountName: z.string(),
      })
      .nullable(),
    applicationFeeAmount: z.number().int().positive().nullable(),
    instructions: z.string().nullable(),
  }),
});

const draftApplicationSchema = z.object({
  id: z.uuid(),
  status: z.enum(APPLICATION_STATUSES),
  version: z.int().min(1),
});

const applicationRelativeDtoSchema = z.object({
  position: z.int().min(1).max(2),
  fullName: z.string().nullable(),
  relationship: z.string().nullable(),
  occupation: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
});

const editableApplicationSchema = draftApplicationSchema.extend({
  latestRevisionReason: z.string().nullable().optional(),
  majorId: z.uuid().nullable(),
  entryQualification: z.enum(ADMISSION_QUALIFICATIONS).nullable(),
  fullName: z.string().nullable(),
  gender: z.enum(GENDERS).nullable(),
  dateOfBirth: z.string().nullable(),
  placeOfBirth: z.string().nullable(),
  ethnicity: z.string().nullable(),
  religion: z.string().nullable(),
  nationality: z.string().nullable(),
  citizenId: z.string().nullable(),
  citizenIdIssuedDate: z.string().nullable(),
  citizenIdIssuedPlace: z.string().nullable(),
  permanentAddress: z.string().nullable(),
  workplace: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  contactAddress: z.string().nullable(),
  admissionDiploma: z.enum(ADMISSION_QUALIFICATIONS).nullable(),
  graduateMajor: z.string().nullable(),
  graduationYear: z.int().nullable(),
  highSchoolName: z.string().nullable(),
  highSchoolWard: z.string().nullable(),
  highSchoolProvince: z.string().nullable(),
  declarationPlace: z.string().nullable(),
  declarationDate: z.string().nullable(),
  declarationConfirmed: z.boolean(),
  dataProcessingConsent: z.boolean(),
  relatives: z.array(applicationRelativeDtoSchema),
});

const submittedApplicationSchema = draftApplicationSchema.extend({
  submissionEmailStatus: z.enum(SUBMISSION_EMAIL_STATUSES),
  submittedAt: z.string(),
});

const vietnameseWardSchema = z.object({
  code: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
});

const addressSuggestionSchema = z.object({
  value: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
});

export type ApiClientErrorKind = ApiErrorKind;
export type ValidationIssue = ApiValidationIssue;
export type RegistrationContext = z.infer<typeof registrationContextSchema>;
export type DraftApplication = z.infer<typeof draftApplicationSchema>;
export type EditableApplication = z.infer<typeof editableApplicationSchema>;
export type SubmittedApplication = z.infer<typeof submittedApplicationSchema>;
export type VietnameseWard = z.infer<typeof vietnameseWardSchema>;
export type AddressSuggestion = z.infer<typeof addressSuggestionSchema>;

type FetchImplementation = typeof fetch;

const SAFE_ERROR_MESSAGES: Partial<Record<ApiErrorKind, string>> = {
  network: "Không thể kết nối đến hệ thống.",
  "not-found": "Không tìm thấy dữ liệu được yêu cầu.",
  conflict: "Dữ liệu đã thay đổi hoặc không còn ở trạng thái phù hợp.",
  validation: "Thông tin gửi lên chưa hợp lệ.",
  "bad-request": "Yêu cầu chưa hợp lệ.",
};

/**
 * Error for the public student pages. Unlike staff screens it never shows the
 * server's message, only a generic one per kind, so nothing internal leaks.
 */
export class ApiClientError extends ApiRequestError {
  constructor(
    kind: ApiErrorKind,
    options: {
      readonly status?: number;
      readonly issues?: readonly ValidationIssue[];
    } = {},
  ) {
    super(
      kind,
      options.status ?? 0,
      SAFE_ERROR_MESSAGES[kind] ?? "Hệ thống đang gặp sự cố.",
      options.issues ?? [],
    );
    this.name = "ApiClientError";
  }
}

async function requestData<T>(
  url: string,
  schema: z.ZodType<T>,
  method: JsonApiMethod,
  body: unknown,
  options: {
    readonly fetchImplementation: FetchImplementation;
    readonly signal?: AbortSignal;
  },
): Promise<T> {
  try {
    return await requestJson(url, method, body, {
      schema,
      ...options,
    });
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;
    throw new ApiClientError(error.kind, {
      status: error.status,
      issues: error.issues,
    });
  }
}

function collectionUrl(token: string): string {
  return `/api/registration-links/${encodeURIComponent(token)}/applications`;
}

function applicationUrl(token: string, applicationId: string): string {
  return `${collectionUrl(token)}/${encodeURIComponent(applicationId)}`;
}

export function getRegistrationContext(
  token: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<RegistrationContext> {
  return requestData(
    `/api/registration-links/${encodeURIComponent(token)}/context`,
    registrationContextSchema,
    "GET",
    undefined,
    { fetchImplementation },
  );
}

export function getVietnameseWards(
  provinceCode: number,
  fetchImplementation: FetchImplementation = fetch,
): Promise<readonly VietnameseWard[]> {
  return requestData(
    `/api/administrative-divisions/provinces/${encodeURIComponent(String(provinceCode))}/wards`,
    z.array(vietnameseWardSchema).max(500),
    "GET",
    undefined,
    { fetchImplementation },
  );
}

export function searchAddressSuggestions(
  token: string,
  query: string,
  options: {
    readonly fetchImplementation?: FetchImplementation;
    readonly signal?: AbortSignal;
  } = {},
): Promise<readonly AddressSuggestion[]> {
  return requestData(
    `/api/registration-links/${encodeURIComponent(token)}/address-suggestions`,
    z.array(addressSuggestionSchema).max(10),
    "POST",
    { query },
    {
      fetchImplementation: options.fetchImplementation ?? fetch,
      signal: options.signal,
    },
  );
}

export function createDraftApplication(
  token: string,
  values: CreateDraftApplicationInput,
  fetchImplementation: FetchImplementation = fetch,
): Promise<DraftApplication> {
  return requestData(
    collectionUrl(token),
    draftApplicationSchema,
    "POST",
    createDraftApplicationSchema.parse(values),
    { fetchImplementation },
  );
}

export function getEditableApplication(
  token: string,
  applicationId: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<EditableApplication> {
  return requestData(
    applicationUrl(token, applicationId),
    editableApplicationSchema,
    "GET",
    undefined,
    { fetchImplementation },
  );
}

export function updateDraftApplication(
  token: string,
  applicationId: string,
  values: UpdateDraftApplicationInput,
  fetchImplementation: FetchImplementation = fetch,
): Promise<EditableApplication> {
  return requestData(
    applicationUrl(token, applicationId),
    editableApplicationSchema,
    "PATCH",
    values,
    { fetchImplementation },
  );
}

export function submitApplication(
  token: string,
  applicationId: string,
  expectedVersion: number,
  fetchImplementation: FetchImplementation = fetch,
): Promise<SubmittedApplication> {
  return requestData(
    `${applicationUrl(token, applicationId)}/submit`,
    submittedApplicationSchema,
    "POST",
    { expectedVersion },
    { fetchImplementation },
  );
}
