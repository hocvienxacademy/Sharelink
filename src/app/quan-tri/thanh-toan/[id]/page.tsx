import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { formatDateTime, formatMoney } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminDetailGrid } from "@/modules/dashboard/presentation/ui/admin-detail-grid";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";
import { getAdminPaymentDetail } from "@/modules/payments";

export const dynamic = "force-dynamic";

export default async function PaymentDetailPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const item = await getAdminPaymentDetail(id);
  if (item === null) notFound();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        parent={{ href: "/quan-tri/thanh-toan", label: "Thanh toán" }}
        title={`Thanh toán ${item.applicationCode ?? item.applicationId.slice(0, 8)}`}
        description="Thông tin tài khoản được che mặc định trên giao diện quản trị."
        action={
          <Button nativeButton={false} variant="outline" render={<Link href={`/quan-tri/ho-so/${item.applicationId}`} />}>
            Mở hồ sơ
          </Button>
        }
      />
      <AdminDetailGrid
        title="Thông tin thanh toán"
        items={[
          { label: "Trạng thái", value: <AdminStatusBadge status={item.status} /> },
          { label: "Sinh viên", value: item.studentName },
          { label: "Số tiền", value: formatMoney(item.amount) },
          { label: "Ngân hàng", value: item.bankName },
          { label: "Số tài khoản", value: item.maskedAccountNumber },
          { label: "Tên tài khoản", value: item.accountName },
          { label: "Nội dung chuyển khoản", value: item.transferContent },
          { label: "Ngày tạo", value: formatDateTime(item.createdAt) },
          { label: "Người xác nhận", value: item.confirmerName },
          { label: "Ngày xác nhận", value: formatDateTime(item.confirmedAt) },
          { label: "Ngày hủy", value: formatDateTime(item.cancelledAt) },
          { label: "Lý do hủy", value: item.cancellationReason },
        ]}
      />
      <BusinessRuleGate>
        Xác nhận và hủy thanh toán chỉ được bật sau khi chốt quyền thực hiện, nguồn số tiền và trạng thái hồ sơ đi kèm.
      </BusinessRuleGate>
    </div>
  );
}
