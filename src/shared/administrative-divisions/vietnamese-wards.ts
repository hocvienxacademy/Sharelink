import wardsData from "./data/vietnamese-wards.json";
import { BadRequestError } from "../errors/index";
import {
  parseVietnameseWardDataset,
  type VietnameseWard,
} from "./vietnamese-wards-dataset";
import { findVietnameseProvinceByCode } from "./vietnamese-provinces";

export type { VietnameseWard } from "./vietnamese-wards-dataset";

const wardDataset = parseVietnameseWardDataset(wardsData);
const wardsByProvinceCode = new Map(
  wardDataset.provinces.map((province) => [
    province.code,
    province.wards.toSorted((left, right) =>
      left.name.localeCompare(right.name, "vi"),
    ),
  ]),
);

export async function fetchVietnameseWards(
  provinceCode: number,
): Promise<readonly VietnameseWard[]> {
  if (findVietnameseProvinceByCode(provinceCode) === undefined) {
    throw new BadRequestError("Mã tỉnh/thành phố không hợp lệ.");
  }

  return [...(wardsByProvinceCode.get(provinceCode) ?? [])];
}
