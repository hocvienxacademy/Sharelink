import { z } from "zod";

import { VIETNAMESE_PROVINCES } from "./vietnamese-provinces";

export const VIETNAMESE_WARDS_SOURCE_URL =
  "https://provinces.open-api.vn/api/v2/?depth=2";

const wardSchema = z.object({
  code: z.number().int().positive(),
  name: z.string().trim().min(1).max(255),
});

const upstreamWardSchema = wardSchema.extend({
  province_code: z.number().int().positive().optional(),
});

const upstreamProvinceSchema = z.object({
  code: z.number().int().positive(),
  name: z.string().trim().min(1).max(255),
  wards: z.array(upstreamWardSchema).min(1).max(1_000),
});

const upstreamPayloadSchema = z.array(upstreamProvinceSchema).min(1).max(100);

const datasetSchema = z.object({
  version: z.literal(1),
  source: z.literal(VIETNAMESE_WARDS_SOURCE_URL),
  provinces: z.array(
    z.object({
      code: z.number().int().positive(),
      name: z.string().trim().min(1).max(255),
      wards: z.array(wardSchema).min(1).max(1_000),
    }),
  ),
});

export type VietnameseWard = z.infer<typeof wardSchema>;
export type VietnameseWardDataset = z.infer<typeof datasetSchema>;

function assertProvinceCoverage(provinceCodes: number[]) {
  const expectedCodes = new Set<number>(
    VIETNAMESE_PROVINCES.map((province) => province.code),
  );
  const actualCodes = new Set(provinceCodes);

  if (actualCodes.size !== provinceCodes.length) {
    throw new Error("Dữ liệu xã/phường chứa mã tỉnh/thành bị trùng.");
  }

  const missingCodes = [...expectedCodes].filter((code) => !actualCodes.has(code));
  const unexpectedCodes = [...actualCodes].filter(
    (code) => !expectedCodes.has(code),
  );

  if (missingCodes.length > 0 || unexpectedCodes.length > 0) {
    throw new Error(
      `Danh sách tỉnh/thành không khớp cấu hình. Thiếu: ${missingCodes.join(", ") || "không"}; dư: ${unexpectedCodes.join(", ") || "không"}.`,
    );
  }
}

function assertUniqueWards(
  provinceCode: number,
  wards: readonly VietnameseWard[],
) {
  const wardCodes = new Set<number>();
  const wardNames = new Set<string>();

  for (const ward of wards) {
    const normalizedName = ward.name.toLocaleLowerCase("vi");

    if (wardCodes.has(ward.code) || wardNames.has(normalizedName)) {
      throw new Error(
        `Tỉnh/thành ${provinceCode} chứa xã/phường bị trùng mã hoặc tên.`,
      );
    }

    wardCodes.add(ward.code);
    wardNames.add(normalizedName);
  }
}

export function createVietnameseWardDataset(
  input: unknown,
): VietnameseWardDataset {
  const result = upstreamPayloadSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Dữ liệu API không đúng cấu trúc (${result.error.issues.length} lỗi).`,
    );
  }
  const provinces = result.data;

  assertProvinceCoverage(provinces.map((province) => province.code));

  const normalizedProvinces = provinces
    .map((province) => {
      for (const ward of province.wards) {
        if (
          ward.province_code !== undefined &&
          ward.province_code !== province.code
        ) {
          throw new Error(
            `Xã/phường ${ward.code} không thuộc tỉnh/thành ${province.code}.`,
          );
        }
      }

      const wards = province.wards
        .map(({ code, name }) => ({ code, name }))
        .sort((left, right) => left.code - right.code);

      assertUniqueWards(province.code, wards);

      return {
        code: province.code,
        name: province.name,
        wards,
      };
    })
    .sort((left, right) => left.code - right.code);

  return {
    version: 1,
    source: VIETNAMESE_WARDS_SOURCE_URL,
    provinces: normalizedProvinces,
  };
}

export function parseVietnameseWardDataset(
  input: unknown,
): VietnameseWardDataset {
  const result = datasetSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `File dữ liệu xã/phường không đúng cấu trúc (${result.error.issues.length} lỗi).`,
    );
  }
  const dataset = result.data;

  assertProvinceCoverage(dataset.provinces.map((province) => province.code));

  for (const province of dataset.provinces) {
    assertUniqueWards(province.code, province.wards);
  }

  return dataset;
}
