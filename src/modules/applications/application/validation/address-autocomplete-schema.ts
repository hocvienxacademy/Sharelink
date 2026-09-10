import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";
import { WORD_EXPORT_TEXT_LIMITS } from "./application-schemas";

export const ADDRESS_AUTOCOMPLETE_MIN_LENGTH = 3;

export const addressAutocompleteInputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(
        ADDRESS_AUTOCOMPLETE_MIN_LENGTH,
        `Địa chỉ tìm kiếm phải có ít nhất ${ADDRESS_AUTOCOMPLETE_MIN_LENGTH} ký tự.`,
      )
      .max(
        WORD_EXPORT_TEXT_LIMITS.permanentAddress,
        `Địa chỉ tìm kiếm không được vượt quá ${WORD_EXPORT_TEXT_LIMITS.permanentAddress} ký tự.`,
      ),
  })
  .strict();

export type AddressAutocompleteInput = z.infer<
  typeof addressAutocompleteInputSchema
>;

export function parseAddressAutocompleteInput(
  input: unknown,
): AddressAutocompleteInput {
  return parseWithSchema(addressAutocompleteInputSchema, input);
}
