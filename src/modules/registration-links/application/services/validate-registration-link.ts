import { NotFoundError } from "../../../../shared/errors/index";
import {
  systemClock,
  type Clock,
} from "../../../../shared/time/index";
import type {
  RegistrationLink,
  RegistrationLinkRepository,
} from "../../domain/registration-link";
import { parseRegistrationToken } from "../validation/registration-token-schema";

export interface ValidatedRegistrationLink {
  readonly link: RegistrationLink;
}

export class ValidateRegistrationLink {
  constructor(
    private readonly registrationLinkRepository: RegistrationLinkRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(tokenInput: unknown): Promise<ValidatedRegistrationLink> {
    const token = parseRegistrationToken(tokenInput);
    const link = await this.registrationLinkRepository.findByPublicToken(token);

    if (
      link === null ||
      link.status !== "ACTIVE" ||
      (link.expiresAt !== null && link.expiresAt <= this.clock.now())
    ) {
      throw new NotFoundError("Registration link");
    }

    return { link };
  }
}
