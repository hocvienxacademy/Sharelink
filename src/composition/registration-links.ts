import {
  GetRegistrationContext,
  ValidateRegistrationLink,
} from "../modules/registration-links/index";
import { PrismaRegistrationLinkRepository } from "../modules/registration-links/infrastructure/index";
import { bankAccountManagementRepository, catalogRepository } from "./catalogs";
import { PrismaAdminRegistrationLinkRepository } from "@/modules/registration-links/infrastructure/prisma-admin-registration-link-repository";
import { RegistrationLinkAdministrationService } from "@/modules/registration-links/application/services/registration-link-administration";
import { QueryRegistrationLinks } from "@/modules/registration-links/application/services/query-registration-links";
import { PrismaAdminRegistrationLinkQueryRepository } from "@/modules/registration-links/infrastructure/prisma-admin-registration-link-queries";

export const registrationLinkRepository =
  new PrismaRegistrationLinkRepository();
export const validateRegistrationLink = new ValidateRegistrationLink(
  registrationLinkRepository,
  catalogRepository,
);
export const getRegistrationContext = new GetRegistrationContext(
  validateRegistrationLink,
  catalogRepository,
  bankAccountManagementRepository,
);
const adminRegistrationLinkRepository = new PrismaAdminRegistrationLinkRepository();
export const adminRegistrationLinks = new RegistrationLinkAdministrationService(
  adminRegistrationLinkRepository,
);
export const registrationLinkQueries = new QueryRegistrationLinks(
  new PrismaAdminRegistrationLinkQueryRepository(),
);
