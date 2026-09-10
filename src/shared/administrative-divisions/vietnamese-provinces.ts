export interface VietnameseProvince {
  readonly code: number;
  readonly name: string;
}

export const VIETNAMESE_PROVINCES = [
  { code: 91, name: "An Giang" },
  { code: 24, name: "Bắc Ninh" },
  { code: 96, name: "Cà Mau" },
  { code: 4, name: "Cao Bằng" },
  { code: 92, name: "Cần Thơ" },
  { code: 48, name: "Đà Nẵng" },
  { code: 66, name: "Đắk Lắk" },
  { code: 11, name: "Điện Biên" },
  { code: 75, name: "Đồng Nai" },
  { code: 82, name: "Đồng Tháp" },
  { code: 52, name: "Gia Lai" },
  { code: 1, name: "Hà Nội" },
  { code: 42, name: "Hà Tĩnh" },
  { code: 31, name: "Hải Phòng" },
  { code: 46, name: "Huế" },
  { code: 33, name: "Hưng Yên" },
  { code: 56, name: "Khánh Hòa" },
  { code: 12, name: "Lai Châu" },
  { code: 68, name: "Lâm Đồng" },
  { code: 20, name: "Lạng Sơn" },
  { code: 15, name: "Lào Cai" },
  { code: 40, name: "Nghệ An" },
  { code: 37, name: "Ninh Bình" },
  { code: 25, name: "Phú Thọ" },
  { code: 51, name: "Quảng Ngãi" },
  { code: 22, name: "Quảng Ninh" },
  { code: 44, name: "Quảng Trị" },
  { code: 14, name: "Sơn La" },
  { code: 80, name: "Tây Ninh" },
  { code: 19, name: "Thái Nguyên" },
  { code: 38, name: "Thanh Hóa" },
  { code: 79, name: "Thành phố Hồ Chí Minh" },
  { code: 8, name: "Tuyên Quang" },
  { code: 86, name: "Vĩnh Long" },
] as const satisfies readonly VietnameseProvince[];

export function findVietnameseProvinceByCode(
  code: number,
): VietnameseProvince | undefined {
  return VIETNAMESE_PROVINCES.find((province) => province.code === code);
}

export function findVietnameseProvinceByName(
  name: string | null | undefined,
): VietnameseProvince | undefined {
  if (name === null || name === undefined) return undefined;
  return VIETNAMESE_PROVINCES.find((province) => province.name === name);
}
