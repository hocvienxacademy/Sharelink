import type { AdmissionQualification } from "../../../../shared/domain/index";
import { NotFoundError, ValidationError } from "../../../../shared/errors/index";
import type { CatalogRepository } from "../../../catalogs/index";
import type { RegistrationLink } from "../../../registration-links/index";

export async function resolveMajorId(
  catalogRepository: CatalogRepository,
  link: RegistrationLink,
  requestedMajorId: string | null | undefined,
): Promise<string | null | undefined> {
  if (link.majorId !== null) {
    if (
      requestedMajorId !== undefined &&
      requestedMajorId !== link.majorId
    ) {
      throw new ValidationError([
        {
          path: ["majorId"],
          code: "fixed_major",
          message: "The major is fixed by the registration link.",
        },
      ]);
    }

    const fixedMajor = await catalogRepository.findActiveMajorById(link.majorId);

    if (fixedMajor === null) {
      throw new NotFoundError("Registration link");
    }

    return fixedMajor.id;
  }

  if (requestedMajorId === undefined || requestedMajorId === null) {
    return requestedMajorId;
  }

  const major = await catalogRepository.findActiveMajorById(requestedMajorId);

  if (major === null) {
    throw new ValidationError([
      {
        path: ["majorId"],
        code: "invalid_major",
        message: "The selected major is not available.",
      },
    ]);
  }

  return major.id;
}

export function resolveEntryQualification(
  link: RegistrationLink,
  requestedQualification: AdmissionQualification | null | undefined,
): AdmissionQualification | null | undefined {
  if (link.entryQualification === null) {
    return requestedQualification;
  }

  if (
    requestedQualification !== undefined &&
    requestedQualification !== link.entryQualification
  ) {
    throw new ValidationError([
      {
        path: ["entryQualification"],
        code: "fixed_entry_qualification",
        message:
          "The entry qualification is fixed by the registration link.",
      },
    ]);
  }

  return link.entryQualification;
}
