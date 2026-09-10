import { parseRegistrationToken } from "@/modules/registration-links";
import { BadRequestError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import {
  handleNextRequest,
  isSameOriginRequest,
  PRIVATE_RESPONSE_HEADERS,
  readJsonBody,
} from "@/shared/http/next";
import {
  getRateLimitGuard,
  type RateLimitGuard,
} from "@/shared/rate-limit";
import { parseAddressAutocompleteInput } from "../../application/validation/address-autocomplete-schema";
import type { AddressSuggestion } from "../../infrastructure/vietmap-address-autocomplete";

interface RegistrationLinkValidator {
  execute(tokenInput: unknown): Promise<unknown>;
}

export type AddressAutocompleteQuery = (
  query: string,
) => Promise<readonly AddressSuggestion[]>;

interface AddressAutocompleteRouteContext {
  readonly params: Promise<{
    readonly token: string;
  }>;
}

export function createAddressAutocompleteHandler(
  search: AddressAutocompleteQuery,
  registrationLinkValidator: RegistrationLinkValidator,
  rateLimitGuard: RateLimitGuard = getRateLimitGuard(),
) {
  return async (
    request: Request,
    context: AddressAutocompleteRouteContext,
  ): Promise<Response> =>
    handleNextRequest(async () => {
      if (!isSameOriginRequest(request)) {
        throw new BadRequestError("Yêu cầu không hợp lệ.");
      }

      const { token: tokenInput } = await context.params;
      await rateLimitGuard.enforce({
        endpoint: "address-autocomplete",
        request,
        token: tokenInput,
      });
      const token = parseRegistrationToken(tokenInput);
      const input = parseAddressAutocompleteInput(
        await readJsonBody(request, 1_024),
      );
      await registrationLinkValidator.execute(token);
      const suggestions = await search(input.query);

      return createSuccessResponse(suggestions);
    }, PRIVATE_RESPONSE_HEADERS, "address-autocomplete");
}
