export const ADMISSION_QUALIFICATIONS = ["THPT", "TC", "CD", "DH"] as const;

export type AdmissionQualification =
  (typeof ADMISSION_QUALIFICATIONS)[number];
