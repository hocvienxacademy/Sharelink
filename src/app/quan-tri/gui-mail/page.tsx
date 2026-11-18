import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { StudentMailPanel } from "@/modules/student-mailing/presentation/ui/student-mail-panel";

export const dynamic = "force-dynamic";

export default async function StudentMailPage() {
  await requireStaffPage();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Gửi mail"
        description="Gửi thông báo hoàn tất thủ tục nhập học (TBHTTTNH) và hóa đơn thu tiền học phí đợt 1 (HĐHPĐ1) hàng loạt cho sinh viên từ file danh sách."
      />
      <StudentMailPanel />
    </div>
  );
}
