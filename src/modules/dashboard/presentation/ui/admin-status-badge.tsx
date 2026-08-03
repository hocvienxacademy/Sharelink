import { Badge } from "@/components/ui/badge";

const labels: Readonly<Record<string, string>> = {
  ACTIVE: "Hoạt động",
  ARCHIVED: "Lưu trữ",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn tất",
  CONFIRMED: "Đã xác nhận",
  DRAFT: "Bản nháp",
  EXPIRED: "Hết hạn",
  LOCKED: "Đã khóa",
  NEEDS_REVISION: "Cần bổ sung",
  PAYMENT_CONFIRMED: "Đã xác nhận phí",
  PENDING: "Đang chờ",
  PRINTED: "Đã in",
  SUBMITTED: "Đã nộp",
  VALID: "Hợp lệ",
  WAITING_PAYMENT: "Chờ thanh toán",
};

export function AdminStatusBadge({ status }: { readonly status: string }) {
  return <Badge variant="secondary">{labels[status] ?? status}</Badge>;
}
