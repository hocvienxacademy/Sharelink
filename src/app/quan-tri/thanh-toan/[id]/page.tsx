import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { paymentQueries } from "@/composition/payments";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { formatDateTime, formatMoney } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminDetailGrid } from "@/modules/dashboard/presentation/ui/admin-detail-grid";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { PaymentActions } from "@/modules/payments/presentation/ui/payment-actions";
import { toAuthenticatedActor } from "@/shared/authorization";

export const dynamic = "force-dynamic";

export default async function PaymentDetailPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const identity = await requireStaffPage();
  const actor = toAuthenticatedActor(identity);
  const { id } = await params;
  const item = await paymentQueries.detailByPaymentId(actor, id);
  if (item === null) notFound();
  const history = (await paymentQueries.history(actor, item.applicationId)) ?? [];
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
          { label: "Phí đã xác nhận", value: formatMoney(item.amount) },
          { label: "Phí nộp hồ sơ hiện hành", value: formatMoney(item.applicationFeeAmount) },
          { label: "Đối soát mức phí", value: item.status === "PENDING" ? "Sẽ ghi nhận khi xác nhận" : item.amountMatchesApplicationFee ? "Khớp mức hiện hành" : "Snapshot khác mức hiện hành" },
          { label: "Trạng thái hồ sơ", value: <AdminStatusBadge status={item.applicationStatus} /> },
          { label: "Ngân hàng", value: item.bankName },
          { label: "Số tài khoản", value: item.maskedAccountNumber },
          { label: "Tên tài khoản", value: item.accountName },
          { label: "Nội dung chuyển khoản", value: item.transferContent },
          { label: "Ngày tạo", value: formatDateTime(item.createdAt) },
          { label: "Người xác nhận", value: item.confirmerName },
          { label: "Ngày xác nhận", value: formatDateTime(item.confirmedAt) },
          { label: "Ghi chú xác nhận", value: item.confirmationNote },
          { label: "Người hủy", value: item.cancellerName },
          { label: "Ngày hủy", value: formatDateTime(item.cancelledAt) },
          { label: "Lý do hủy", value: item.cancellationReason },
        ]}
      />
      <PaymentActions
        applicationFeeConfigured={item.applicationFeeAmount !== null}
        applicationId={item.applicationId}
        applicationStatus={item.applicationStatus}
        role={identity.role}
        status={item.status}
        updatedAtIso={item.updatedAtIso}
      />
      <section className="flex flex-col gap-4" aria-labelledby="payment-history-title">
        <h2 id="payment-history-title" className="text-xl font-semibold">Lịch sử trạng thái</h2>
        <div className="overflow-x-auto rounded-2xl border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr><th className="p-4">Thời gian</th><th className="p-4">Thay đổi</th><th className="p-4">Người thực hiện</th><th className="p-4">Nội dung</th></tr>
            </thead>
            <tbody>
              {history.map((event) => (
                <tr key={event.id} className="border-b last:border-0">
                  <td className="p-4">{formatDateTime(event.createdAt)}</td>
                  <td className="p-4"><AdminStatusBadge status={event.newStatus} /></td>
                  <td className="p-4">{event.actorName}</td>
                  <td className="max-w-xl whitespace-pre-wrap p-4">{event.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
