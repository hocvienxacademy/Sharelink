import type { CreateDraftApplicationInput } from "../../application/validation/application-schemas";
import type {
  EditableApplication,
  RegistrationContext,
} from "./application-api-client";

type DefinedFields<T> = {
  [Key in keyof T]-?: Exclude<T[Key], undefined>;
};

type DraftFields = DefinedFields<CreateDraftApplicationInput>;
type DraftRelative = NonNullable<DraftFields["relatives"]>[number];

export type ApplicationRelativeFormValues = DefinedFields<DraftRelative>;
export type ApplicationFormValues = Omit<DraftFields, "relatives"> & {
  relatives: ApplicationRelativeFormValues[];
};

export const EMPTY_APPLICATION_FORM: ApplicationFormValues = {
  majorId: null,
  entryQualification: null,
  fullName: null,
  gender: null,
  dateOfBirth: null,
  placeOfBirth: null,
  ethnicity: null,
  religion: null,
  nationality: null,
  citizenId: null,
  citizenIdIssuedDate: null,
  citizenIdIssuedPlace: null,
  permanentAddress: null,
  workplace: null,
  phone: null,
  email: null,
  contactAddress: null,
  admissionDiploma: null,
  graduateMajor: null,
  graduationYear: null,
  highSchoolName: null,
  highSchoolWard: null,
  highSchoolProvince: null,
  declarationPlace: null,
  declarationDate: null,
  declarationConfirmed: false,
  dataProcessingConsent: false,
  relatives: [],
};

export function initialFormValues(
  context: RegistrationContext,
  application?: EditableApplication,
): ApplicationFormValues {
  if (application !== undefined) {
    const {
      id: _id,
      status: _status,
      version: _version,
      latestRevisionReason: _latestRevisionReason,
      ...values
    } = application;

    return {
      ...EMPTY_APPLICATION_FORM,
      ...values,
      relatives: values.relatives.map((relative, index) => ({
        ...relative,
        position: index + 1,
      })),
    };
  }

  return {
    ...EMPTY_APPLICATION_FORM,
    fullName: context.studentNameHint,
    entryQualification: context.entryQualification,
  };
}

export function emptyRelative(position: number): ApplicationRelativeFormValues {
  return {
    position,
    fullName: null,
    relationship: null,
    occupation: null,
    phone: null,
    address: null,
  };
}
