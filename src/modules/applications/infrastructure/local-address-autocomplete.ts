import { listVietnameseAdministrativeProvinces } from "@/shared/administrative-divisions/vietnamese-wards";
import { WORD_EXPORT_TEXT_LIMITS } from "../application/validation/application-schemas";

const MAX_SUGGESTIONS = 10;
const MIN_SEARCH_TERM_LENGTH = 2;
const DIVISION_PREFIX = /^(?:phuong|xa|dac khu)\s+/u;

export interface AddressSuggestion {
  readonly value: string;
  readonly label: string;
}

interface WardIndexEntry {
  readonly wardName: string;
  readonly provinceName: string;
  readonly normalizedWard: string;
  readonly normalizedShortWard: string;
  readonly normalizedWithProvince: string;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .replaceAll(/\s+/gu, " ")
    .trim();
}

let wardIndex: readonly WardIndexEntry[] | null = null;

function getWardIndex(): readonly WardIndexEntry[] {
  wardIndex ??= listVietnameseAdministrativeProvinces().flatMap((province) =>
    province.wards.map((ward) => {
      const normalizedWard = normalize(ward.name);
      return {
        wardName: ward.name,
        provinceName: province.fullName,
        normalizedWard,
        normalizedShortWard: normalizedWard.replace(DIVISION_PREFIX, ""),
        normalizedWithProvince: `${normalizedWard} ${normalize(province.fullName)}`,
      };
    }),
  );
  return wardIndex;
}

function matchRank(entry: WardIndexEntry, term: string): number | null {
  if (entry.normalizedShortWard.startsWith(term) || entry.normalizedWard.startsWith(term)) return 0;
  if (entry.normalizedWard.includes(term)) return 1;
  if (entry.normalizedWithProvince.includes(term)) return 2;
  return null;
}

/**
 * Suggests complete addresses from the bundled post-2025 administrative units.
 * The last comma-separated segment of the query is matched against ward names;
 * earlier segments (house number, street) are kept as typed.
 */
export async function searchLocalAddresses(
  query: string,
): Promise<readonly AddressSuggestion[]> {
  const segments = query.split(",").map((segment) => segment.replaceAll(/\s+/gu, " ").trim());
  const term = normalize(segments.at(-1) ?? "").replace(/[.]/gu, " ").trim();
  if (term.length < MIN_SEARCH_TERM_LENGTH) return [];

  const prefix = segments.slice(0, -1).filter(Boolean).join(", ");
  const matches = getWardIndex()
    .map((entry) => ({ entry, rank: matchRank(entry, term) }))
    .filter((match): match is { entry: WardIndexEntry; rank: number } => match.rank !== null)
    .sort((left, right) =>
      left.rank - right.rank ||
      left.entry.wardName.localeCompare(right.entry.wardName, "vi") ||
      left.entry.provinceName.localeCompare(right.entry.provinceName, "vi"),
    );

  const suggestions: AddressSuggestion[] = [];
  for (const { entry } of matches) {
    const value = [prefix, entry.wardName, entry.provinceName].filter(Boolean).join(", ");
    if (value.length > WORD_EXPORT_TEXT_LIMITS.permanentAddress) continue;
    suggestions.push({ value, label: value });
    if (suggestions.length === MAX_SUGGESTIONS) break;
  }

  return suggestions;
}
