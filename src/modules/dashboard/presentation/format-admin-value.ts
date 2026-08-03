export function formatDateTime(value: Date | null): string {
  return value === null
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(value);
}

export function formatDate(value: Date | null): string {
  return value === null
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeZone: "UTC",
      }).format(value);
}

export function formatMoney(value: string | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value));
}

export function maskAccountNumber(value: string): string {
  return value.length <= 4 ? "••••" : `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}

export function maskCitizenId(value: string | null): string {
  if (value === null || value.length < 4) return "—";
  return `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}
