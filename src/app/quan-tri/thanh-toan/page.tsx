import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { formatDateTime, formatMoney } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { listAdminPayments } from "@/modules/payments";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requireAdminPage();
  const payments = await listAdminPayments();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Xác nhận thanh toán" description="Theo dõi các bản ghi thanh toán mà không hiển thị số tài khoản đầy đủ trên danh sách." />
      <AdminResourceTable
        columns={[
          { key: "application", label: "Hồ sơ" },
          { key: "student", label: "Sinh viên" },
          { key: "status", label: "Trạng thái" },
          { key: "bank", label: "Ngân hàng" },
          { key: "amount", label: "Số tiền" },
          { key: "created", label: "Ngày tạo" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có bản ghi xác nhận thanh toán."
        rows={payments.map((item) => ({
          id: item.id,
          application: item.applicationCode ?? item.applicationId.slice(0, 8),
          student: item.studentName ?? "Chưa nhập họ tên",
          status: <AdminStatusBadge status={item.status} />,
          bank: item.bankName,
          amount: formatMoney(item.amount),
          created: formatDateTime(item.createdAt),
          action: (
            <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={`/quan-tri/thanh-toan/${item.id}`} />}>
              Chi tiết<ArrowRightIcon data-icon="inline-end" />
            </Button>
          ),
        }))}
      />
    </div>
  );
}
