import { z } from "zod";
import { InternalServerError } from "@/shared/errors";
import { WORD_EXPORT_TEXT_LIMITS } from "../application/validation/application-schemas";

const VIETMAP_AUTOCOMPLETE_URL =
  "https://maps.vietmap.vn/api/autocomplete/v4";
const VIETMAP_TIMEOUT_MS = 5_000;

const vietmapSuggestionSchema = z.object({
  display: z.string().min(1).max(500),
});

const vietmapResponseSchema = z.array(vietmapSuggestionSchema).max(10);

export interface AddressSuggestion {
  readonly value: string;
  readonly label: string;
}

export type VietmapFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function requiredApiKey(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const apiKey = environment.VIETMAP_API_KEY?.trim();
  if (!apiKey) {
    throw new InternalServerError({
      cause: new Error("VIETMAP_API_KEY is not configured."),
    });
  }
  return apiKey;
}

function normalizeDisplay(value: string): string {
  return value.replaceAll(/\s+/gu, " ").trim();
}

export async function searchVietmapAddresses(
  query: string,
  options: {
    readonly environment?: Readonly<Record<string, string | undefined>>;
    readonly fetchImplementation?: VietmapFetch;
  } = {},
): Promise<readonly AddressSuggestion[]> {
  const environment = options.environment ?? process.env;
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const url = new URL(VIETMAP_AUTOCOMPLETE_URL);
  url.searchParams.set("apikey", requiredApiKey(environment));
  url.searchParams.set("text", query);
  url.searchParams.set("display_type", "1");

  let response: Response;
  try {
    response = await fetchImplementation(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(VIETMAP_TIMEOUT_MS),
    });
  } catch (cause: unknown) {
    throw new InternalServerError({ cause });
  }

  if (!response.ok) {
    throw new InternalServerError({
      cause: new Error(`VietMap Autocomplete returned ${response.status}.`),
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause: unknown) {
    throw new InternalServerError({ cause });
  }

  const parsed = vietmapResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InternalServerError({ cause: parsed.error });
  }

  const suggestions = new Map<string, AddressSuggestion>();
  for (const item of parsed.data) {
    const display = normalizeDisplay(item.display);
    if (
      display.length === 0 ||
      display.length > WORD_EXPORT_TEXT_LIMITS.permanentAddress
    ) {
      continue;
    }
    suggestions.set(display, { value: display, label: display });
  }

  return [...suggestions.values()];
}
