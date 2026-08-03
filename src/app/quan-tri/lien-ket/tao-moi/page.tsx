import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { listAdminAdmissionPeriods, listAdminMajors } from "@/modules/catalogs";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";
import { countActiveSales } from "@/modules/users";

export const dynamic = "force-dynamic";

export default async function CreateRegistrationLinkPage() {
  await requireAdminPage();
  const [periods, majors, activeSales] = await Promise.all([
    listAdminAdmissionPeriods(),
    listAdminMajors(),
    countActiveSales(),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        parent={{ href: "/quan-tri/lien-ket", label: "Liên kết" }}
        title="Tạo liên kết"
        description="Màn hình chuẩn bị dữ liệu cho liên kết mới; thao tác ghi đang được khóa an toàn."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["SALE hoạt động", activeSales],
          ["Kỳ tuyển sinh", periods.filter((item) => item.isActive).length],
          ["Ngành đang mở", majors.filter((item) => item.isActive).length],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-4xl">{value}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Sẵn sàng để dùng làm lựa chọn.</CardContent>
          </Card>
        ))}
      </div>
      <BusinessRuleGate>
        Cần phê duyệt trường bắt buộc, quyền gán SALE, thời điểm kích hoạt và quy tắc hết hạn trước khi API tạo liên kết được mở.
      </BusinessRuleGate>
    </div>
  );
}
