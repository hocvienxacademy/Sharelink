import { createSuccessResponse } from "../../../../shared/http/index";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
} from "../../../../shared/http/next/index";
import type { RegistrationContextDto } from "../../application/dto/registration-context-dto";
import { parseRegistrationToken } from "../../application/validation/registration-token-schema";
import {
  getRateLimitGuard,
  type RateLimitGuard,
} from "../../../../shared/rate-limit/index";

interface RegistrationContextService {
  execute(tokenInput: unknown): Promise<RegistrationContextDto>;
}

interface RegistrationContextRouteContext {
  readonly params: Promise<{
    readonly token: string;
  }>;
}

export function createGetRegistrationContextHandler(
  service: RegistrationContextService,
  rateLimitGuard: RateLimitGuard = getRateLimitGuard(),
) {
  return async (
    request: Request,
    context: RegistrationContextRouteContext,
  ): Promise<Response> =>
    handleNextRequest(async () => {
      const { token: tokenInput } = await context.params;
      await rateLimitGuard.enforce({
        endpoint: "context",
        request,
        token: tokenInput,
      });
      const token = parseRegistrationToken(tokenInput);
      const result = await service.execute(token);

      return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS);
}
