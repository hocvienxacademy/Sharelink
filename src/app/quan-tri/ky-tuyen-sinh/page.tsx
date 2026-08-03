import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { listAdminAdmissionPeriods } from "@/modules/catalogs";
import { formatDate } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";

export const dynamic = "force-dynamic";

export default async function AdmissionPeriodsPage() {
  await requireAdminPage();
  const periods = await listAdminAdmissionPeriods();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Kỳ tuyển sinh" description="Danh mục kỳ tiếp nhận được liên kết với hồ sơ và registration link." />
      <BusinessRuleGate>
        Tạo và chỉnh sửa kỳ tuyển sinh chờ quy tắc chồng lấn thời gian và ảnh hưởng lên kỳ đang được sử dụng.
      </BusinessRuleGate>
      <AdminResourceTable
        columns={[
          { key: "code", label: "Mã" }, { key: "name", label: "Tên kỳ" },
          { key: "start", label: "Bắt đầu" }, { key: "end", label: "Kết thúc" },
          { key: "status", label: "Trạng thái" },
        ]}
        emptyDescription="Chưa có kỳ tuyển sinh."
        rows={periods.map((item) => ({
          id: item.id, code: item.code, name: item.name,
          start: formatDate(item.startDate), end: formatDate(item.endDate),
          status: <Badge variant="secondary">{item.isActive ? "Hoạt động" : "Tạm dừng"}</Badge>,
        }))}
      />
    </div>
  );
}
