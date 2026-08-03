export function maskSensitiveValue(
  value: string | null,
  visibleSuffixLength = 4,
): string {
  if (value === null) return "—";
  if (value.length <= visibleSuffixLength) return "•".repeat(visibleSuffixLength);
  const hiddenLength = Math.min(8, value.length - visibleSuffixLength);
  return `${"•".repeat(hiddenLength)}${value.slice(-visibleSuffixLength)}`;
}
