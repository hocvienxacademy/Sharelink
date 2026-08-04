import { z } from "zod";
import { ADMISSION_QUALIFICATIONS } from "../../../../shared/domain/index";
import { APPLICATION_STATUSES, GENDERS } from "../../domain/application";
import {
  createDraftApplicationSchema,
  type CreateDraftApplicationInput,
  type UpdateDraftApplicationInput,
} from "../../application/validation/application-schemas";
import { REGISTRATION_LINK_STATUSES } from "../../../registration-links/domain/registration-link";

const validationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
  message: z.string(),
});

const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const registrationContextSchema = z.object({
  status: z.enum(REGISTRATION_LINK_STATUSES),
  admissionPeriod: z.object({
    code: z.string(),
    name: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  }),
  majors: z.array(
    z.object({
      id: z.uuid(),
      code: z.string(),
      name: z.string(),
    }),
  ),
  studentNameHint: z.string().nullable(),
  entryQualification: z.enum(ADMISSION_QUALIFICATIONS).nullable(),
  hasApplication: z.boolean(),
  application: z
    .object({
      id: z.uuid(),
      status: z.string(),
    })
    .nullable(),
  bankAccount: z.object({
    bankCode: z.string(),
    bankName: z.string(),
    branchName: z.string().nullable(),
    accountNumber: z.string(),
    accountName: z.string(),
  }).nullable(),
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
  submittedAt: z.string(),
});

const apiErrorKinds = {
  400: "bad-request",
  404: "not-found",
  409: "conflict",
  422: "validation",
} as const;

export type ApiClientErrorKind =
  | (typeof apiErrorKinds)[keyof typeof apiErrorKinds]
  | "network"
  | "server";

export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type RegistrationContext = z.infer<typeof registrationContextSchema>;
export type DraftApplication = z.infer<typeof draftApplicationSchema>;
export type EditableApplication = z.infer<typeof editableApplicationSchema>;
export type SubmittedApplication = z.infer<typeof submittedApplicationSchema>;

export class ApiClientError extends Error {
  readonly kind: ApiClientErrorKind;
  readonly issues: readonly ValidationIssue[];
  readonly status: number | null;

  constructor(
    kind: ApiClientErrorKind,
    options: {
      readonly status?: number;
      readonly issues?: readonly ValidationIssue[];
    } = {},
  ) {
    super(toSafeErrorMessage(kind));
    this.name = "ApiClientError";
    this.kind = kind;
    this.issues = options.issues ?? [];
    this.status = options.status ?? null;
  }
}

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function toSafeErrorMessage(kind: ApiClientErrorKind): string {
  switch (kind) {
    case "network":
      return "Không thể kết nối đến hệ thống.";
    case "not-found":
      return "Không tìm thấy dữ liệu được yêu cầu.";
    case "conflict":
      return "Dữ liệu đã thay đổi hoặc không còn ở trạng thái phù hợp.";
    case "validation":
      return "Thông tin gửi lên chưa hợp lệ.";
    case "bad-request":
      return "Yêu cầu chưa hợp lệ.";
    default:
      return "Hệ thống đang gặp sự cố.";
  }
}

function errorKindForStatus(status: number): ApiClientErrorKind {
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return apiErrorKinds[status];
  }

  return "server";
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

async function requestData<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  init: RequestInit,
  fetchImplementation: FetchImplementation,
): Promise<z.output<TSchema>> {
  let response: Response;

  try {
    response = await fetchImplementation(url, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      referrerPolicy: "no-referrer",
      headers: {
        Accept: "application/json",
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiClientError("network");
  }

  const payload = parseJson(await response.text());

  if (!response.ok) {
    const parsedError = errorEnvelopeSchema.safeParse(payload);
    const parsedIssues = parsedError.success
      ? validationIssueSchema.array().safeParse(parsedError.data.error.details)
      : null;

    throw new ApiClientError(errorKindForStatus(response.status), {
      status: response.status,
      issues: parsedIssues?.success ? parsedIssues.data : [],
    });
  }

  if (!isRecord(payload) || payload.success !== true) {
    throw new ApiClientError("server", { status: response.status });
  }

  const data = schema.safeParse(payload.data);

  if (!data.success) {
    throw new ApiClientError("server", { status: response.status });
  }

  return data.data;
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
    { method: "GET" },
    fetchImplementation,
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
    {
      method: "POST",
      body: JSON.stringify(createDraftApplicationSchema.parse(values)),
    },
    fetchImplementation,
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
    { method: "GET" },
    fetchImplementation,
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
    {
      method: "PATCH",
      body: JSON.stringify(values),
    },
    fetchImplementation,
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
    {
      method: "POST",
      body: JSON.stringify({ expectedVersion }),
    },
    fetchImplementation,
  );
}
