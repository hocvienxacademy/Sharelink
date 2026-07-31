import { createSuccessResponse } from "../../../../shared/http/index";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
  readJsonBody,
} from "../../../../shared/http/next/index";
import { parseRegistrationToken } from "../../../registration-links/index";
import {
  getRateLimitGuard,
  type RateLimitGuard,
} from "../../../../shared/rate-limit/index";
import type {
  DraftApplicationDto,
  EditableApplicationDto,
  SubmittedApplicationResultDto,
} from "../../application/dto/application-dto";
import {
  parseApplicationIdentifier,
  parseCreateDraftApplicationInput,
  parseSubmitApplicationInput,
  parseUpdateDraftApplicationInput,
} from "../../application/validation/application-schemas";

interface CreateDraftApplicationService {
  execute(tokenInput: unknown, input: unknown): Promise<DraftApplicationDto>;
}

interface GetEditableApplicationService {
  execute(
    tokenInput: unknown,
    applicationIdInput: unknown,
  ): Promise<EditableApplicationDto>;
}

interface UpdateDraftApplicationService {
  execute(
    tokenInput: unknown,
    applicationIdInput: unknown,
    input: unknown,
  ): Promise<EditableApplicationDto>;
}

interface SubmitApplicationService {
  execute(
    tokenInput: unknown,
    applicationIdInput: unknown,
    input: unknown,
  ): Promise<SubmittedApplicationResultDto>;
}

interface RegistrationLinkRouteContext {
  readonly params: Promise<{
    readonly token: string;
  }>;
}

interface ApplicationRouteContext {
  readonly params: Promise<{
    readonly token: string;
    readonly applicationId: string;
  }>;
}

export function createCreateDraftApplicationHandler(
  service: CreateDraftApplicationService,
  rateLimitGuard: RateLimitGuard = getRateLimitGuard(),
) {
  return async (
    request: Request,
    context: RegistrationLinkRouteContext,
  ): Promise<Response> =>
    handleNextRequest(async () => {
      const { token: tokenInput } = await context.params;
      await rateLimitGuard.enforce({
        endpoint: "create",
        request,
        token: tokenInput,
      });
      const token = parseRegistrationToken(tokenInput);
      const input = parseCreateDraftApplicationInput(
        await readJsonBody(request),
      );
      const result = await service.execute(token, input);

      return createSuccessResponse(result, { status: 201 });
    }, PRIVATE_RESPONSE_HEADERS, "create");
}

export function createGetEditableApplicationHandler(
  service: GetEditableApplicationService,
  rateLimitGuard: RateLimitGuard = getRateLimitGuard(),
) {
  return async (
    request: Request,
    context: ApplicationRouteContext,
  ): Promise<Response> =>
    handleNextRequest(async () => {
      const { token: tokenInput, applicationId: applicationIdInput } =
        await context.params;
      await rateLimitGuard.enforce({
        endpoint: "context",
        request,
        token: tokenInput,
      });
      const token = parseRegistrationToken(tokenInput);
      const applicationId = parseApplicationIdentifier(applicationIdInput);
      const result = await service.execute(token, applicationId);

      return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS, "context");
}

export function createUpdateDraftApplicationHandler(
  service: UpdateDraftApplicationService,
  rateLimitGuard: RateLimitGuard = getRateLimitGuard(),
) {
  return async (
    request: Request,
    context: ApplicationRouteContext,
  ): Promise<Response> =>
    handleNextRequest(async () => {
      const { token: tokenInput, applicationId: applicationIdInput } =
        await context.params;
      await rateLimitGuard.enforce({
        endpoint: "update",
        request,
        token: tokenInput,
      });
      const token = parseRegistrationToken(tokenInput);
      const applicationId = parseApplicationIdentifier(applicationIdInput);
      const input = parseUpdateDraftApplicationInput(
        await readJsonBody(request),
      );
      const result = await service.execute(token, applicationId, input);

      return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS, "update");
}

export function createSubmitApplicationHandler(
  service: SubmitApplicationService,
  rateLimitGuard: RateLimitGuard = getRateLimitGuard(),
) {
  return async (
    request: Request,
    context: ApplicationRouteContext,
  ): Promise<Response> =>
    handleNextRequest(async () => {
      const { token: tokenInput, applicationId: applicationIdInput } =
        await context.params;
      await rateLimitGuard.enforce({
        endpoint: "submit",
        request,
        token: tokenInput,
      });
      const token = parseRegistrationToken(tokenInput);
      const applicationId = parseApplicationIdentifier(applicationIdInput);
      const input = parseSubmitApplicationInput(await readJsonBody(request));
      const result = await service.execute(token, applicationId, input);

      return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS, "submit");
}
