import type { NextRequest } from "next/server";
import { BadRequestError } from "../errors/index";
import { createSuccessResponse } from "../http/api-response";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
} from "../http/next/next-api-response";
import { findVietnameseProvinceByCode } from "./vietnamese-provinces";
import {
  fetchVietnameseWards,
  type VietnameseWard,
} from "./vietnamese-wards";

export type WardQuery = (
  provinceCode: number,
) => Promise<readonly VietnameseWard[]>;

interface WardRouteContext {
  readonly params: Promise<{
    readonly provinceCode: string;
  }>;
}

function parseProvinceCode(value: string): number {
  if (!/^\d{1,3}$/.test(value)) {
    throw new BadRequestError("Mã tỉnh/thành phố không hợp lệ.");
  }

  const code = Number(value);
  if (findVietnameseProvinceByCode(code) === undefined) {
    throw new BadRequestError("Mã tỉnh/thành phố không hợp lệ.");
  }

  return code;
}

export function createVietnameseWardListHandler(
  query: WardQuery = fetchVietnameseWards,
) {
  return async (_request: NextRequest, context: WardRouteContext) =>
    handleNextRequest(
      async () => {
        const { provinceCode } = await context.params;
        const wards = await query(parseProvinceCode(provinceCode));
        return createSuccessResponse(wards);
      },
      PRIVATE_RESPONSE_HEADERS,
      "administrative-division-read",
    );
}
