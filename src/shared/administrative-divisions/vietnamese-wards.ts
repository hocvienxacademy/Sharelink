import { BadRequestError } from "../errors/index";
import administrativeUnits from "./data/vietnam-administrative-units.json";
import { findVietnameseProvinceByCode } from "./vietnamese-provinces";

export interface VietnameseWard {
  readonly code: number;
  readonly name: string;
}

export interface VietnameseAdministrativeProvince {
  readonly code: number;
  readonly name: string;
  readonly fullName: string;
  readonly wards: readonly VietnameseWard[];
}

const PROVINCES: readonly VietnameseAdministrativeProvince[] =
  administrativeUnits.provinces.map((province) => ({
    code: province.code,
    name: province.name,
    fullName: province.fullName,
    wards: province.wards.map((ward) => ({ code: ward.code, name: ward.name })),
  }));

const WARDS_BY_PROVINCE_CODE = new Map(
  PROVINCES.map((province) => [province.code, province.wards]),
);

export function listVietnameseAdministrativeProvinces(): readonly VietnameseAdministrativeProvince[] {
  return PROVINCES;
}

export async function listVietnameseWards(
  provinceCode: number,
): Promise<readonly VietnameseWard[]> {
  const wards = WARDS_BY_PROVINCE_CODE.get(provinceCode);
  if (findVietnameseProvinceByCode(provinceCode) === undefined || wards === undefined) {
    throw new BadRequestError("Mã tỉnh/thành phố không hợp lệ.");
  }

  return wards;
}
