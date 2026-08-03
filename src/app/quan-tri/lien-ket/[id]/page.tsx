import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminDetailGrid } from "@/modules/dashboard/presentation/ui/admin-detail-grid";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";
import { formatDateTime, formatMoney } from "@/modules/dashboard/presentation/format-admin-value";
import { getAdminRegistrationLinkDetail } from "@/modules/registration-links";

export const dynamic = "force-dynamic";

export default async function RegistrationLinkDetailPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const item = await getAdminRegistrationLinkDetail(id);
  if (item === null) notFound();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        parent={{ href: "/quan-tri/lien-ket", label: "Liên kết" }}
        title={item.studentNameHint ?? "Chi tiết liên kết"}
        description="Public token và ghi chú nội bộ không được trả về màn hình khi quyền hiển thị chưa được phê duyệt."
        action={item.applicationId === null ? null : (
          <Button nativeButton={false} variant="outline" render={<Link href={`/quan-tri/ho-so/${item.applicationId}`} />}>
            Mở hồ sơ
          </Button>
        )}
      />
      <AdminDetailGrid
        title="Thông tin liên kết"
        items={[
          { label: "Trạng thái", value: <AdminStatusBadge status={item.status} /> },
          { label: "SALE phụ trách", value: item.saleName },
          { label: "Kỳ tuyển sinh", value: item.admissionPeriod },
          { label: "Ngành", value: item.major },
          { label: "Học phí", value: formatMoney(item.tuitionAmount) },
          { label: "Đợt thanh toán", value: item.paymentRound },
          { label: "Ngày tạo", value: formatDateTime(item.createdAt) },
          { label: "Hết hạn", value: formatDateTime(item.expiresAt) },
          { label: "Lần truy cập", value: item.accessCount },
        ]}
      />
      <BusinessRuleGate>
        Các thao tác kích hoạt, khóa, hủy và lưu trữ chờ transition matrix của registration link.
      </BusinessRuleGate>
      <AdminResourceTable
        columns={[
          { key: "transition", label: "Chuyển trạng thái" },
          { key: "actor", label: "Người thực hiện" },
          { key: "reason", label: "Lý do" },
          { key: "time", label: "Thời gian" },
        ]}
        emptyDescription="Liên kết chưa có lịch sử trạng thái."
        rows={item.histories.map((history, index) => ({
          id: `${index}`,
          transition: `${history.previousStatus ?? "Khởi tạo"} → ${history.newStatus}`,
          actor: history.actorName,
          reason: history.reason ?? "—",
          time: formatDateTime(history.createdAt),
        }))}
      />
    </div>
  );
}
