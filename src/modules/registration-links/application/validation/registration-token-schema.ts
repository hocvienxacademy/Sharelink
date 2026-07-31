import { z } from "zod";
import { parseWithSchema } from "../../../../shared/validation/index";

export const registrationTokenSchema = z.uuid();

export function parseRegistrationToken(input: unknown): string {
  return parseWithSchema(registrationTokenSchema, input);
}
