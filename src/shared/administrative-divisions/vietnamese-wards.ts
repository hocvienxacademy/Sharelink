import { z } from "zod";
import { BadRequestError, InternalServerError } from "../errors/index";
import { findVietnameseProvinceByCode } from "./vietnamese-provinces";

const PROVINCES_API_ORIGIN = "https://provinces.open-api.vn";
const UPSTREAM_TIMEOUT_MS = 5_000;
const UPSTREAM_REVALIDATE_SECONDS = 86_400;

const upstreamWardSchema = z.object({
  code: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  province_code: z.number().int().positive(),
});

const upstreamProvinceSchema = z.object({
  code: z.number().int().positive(),
  wards: z.array(upstreamWardSchema).max(500),
});

export interface VietnameseWard {
  readonly code: number;
  readonly name: string;
}

interface NextFetchOptions extends RequestInit {
  readonly next?: {
    readonly revalidate: number;
  };
}

export type AdministrativeDivisionFetch = (
  input: RequestInfo | URL,
  init?: NextFetchOptions,
) => Promise<Response>;

export async function fetchVietnameseWards(
  provinceCode: number,
  fetchImplementation: AdministrativeDivisionFetch = fetch,
): Promise<readonly VietnameseWard[]> {
  if (findVietnameseProvinceByCode(provinceCode) === undefined) {
    throw new BadRequestError("Mã tỉnh/thành phố không hợp lệ.");
  }

  let response: Response;

  try {
    response = await fetchImplementation(
      `${PROVINCES_API_ORIGIN}/api/v2/p/${provinceCode}?depth=2`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        next: { revalidate: UPSTREAM_REVALIDATE_SECONDS },
      },
    );
  } catch (cause: unknown) {
    throw new InternalServerError({ cause });
  }

  if (!response.ok) {
    throw new InternalServerError({
      cause: new Error(`Administrative API returned ${response.status}.`),
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause: unknown) {
    throw new InternalServerError({ cause });
  }

  const parsed = upstreamProvinceSchema.safeParse(payload);
  if (!parsed.success || parsed.data.code !== provinceCode) {
    throw new InternalServerError({ cause: parsed.error });
  }

  const wardsByName = new Map<string, VietnameseWard>();
  for (const ward of parsed.data.wards) {
    if (ward.province_code !== provinceCode) {
      throw new InternalServerError({
        cause: new Error("Administrative API returned a mismatched province."),
      });
    }
    wardsByName.set(ward.name, { code: ward.code, name: ward.name });
  }

  return [...wardsByName.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "vi"),
  );
}
