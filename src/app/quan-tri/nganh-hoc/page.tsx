import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { listAdminMajors } from "@/modules/catalogs";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";

export const dynamic = "force-dynamic";

export default async function MajorsPage() {
  await requireAdminPage();
  const majors = await listAdminMajors();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Ngành học" description="Danh mục ngành hiển thị cho biểu mẫu đăng ký sinh viên." />
      <BusinessRuleGate>
        Tạo, đổi mã và vô hiệu hóa ngành chờ quy tắc xử lý các hồ sơ hoặc liên kết đang tham chiếu.
      </BusinessRuleGate>
      <AdminResourceTable
        columns={[
          { key: "order", label: "Thứ tự" }, { key: "code", label: "Mã ngành" },
          { key: "name", label: "Tên ngành" }, { key: "status", label: "Trạng thái" },
        ]}
        emptyDescription="Chưa có ngành học."
        rows={majors.map((item) => ({
          id: item.id, order: item.displayOrder, code: item.code, name: item.name,
          status: <Badge variant="secondary">{item.isActive ? "Hoạt động" : "Tạm dừng"}</Badge>,
        }))}
      />
    </div>
  );
}
