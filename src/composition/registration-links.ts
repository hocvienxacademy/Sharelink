import {
  GetRegistrationContext,
  ValidateRegistrationLink,
} from "../modules/registration-links/index";
import { PrismaRegistrationLinkRepository } from "../modules/registration-links/infrastructure/index";
import { catalogRepository } from "./catalogs";

export const registrationLinkRepository =
  new PrismaRegistrationLinkRepository();
export const validateRegistrationLink = new ValidateRegistrationLink(
  registrationLinkRepository,
  catalogRepository,
);
export const getRegistrationContext = new GetRegistrationContext(
  validateRegistrationLink,
  catalogRepository,
);
