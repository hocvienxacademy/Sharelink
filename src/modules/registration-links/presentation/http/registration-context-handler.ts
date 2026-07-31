import { createSuccessResponse } from "../../../../shared/http/index";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
} from "../../../../shared/http/next/index";
import type { RegistrationContextDto } from "../../application/dto/registration-context-dto";
import { parseRegistrationToken } from "../../application/validation/registration-token-schema";

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
) {
  return async (
    _request: Request,
    context: RegistrationContextRouteContext,
  ): Promise<Response> =>
    handleNextRequest(async () => {
      const { token: tokenInput } = await context.params;
      const token = parseRegistrationToken(tokenInput);
      const result = await service.execute(token);

      return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS);
}
