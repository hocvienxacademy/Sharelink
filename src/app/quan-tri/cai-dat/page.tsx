import { listSystemSettings } from "@/composition/system-settings";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { SystemSettingManagementPanel } from "@/modules/system-settings/presentation/ui/system-setting-management-panel";
import { toAuthenticatedActor } from "@/shared/authorization";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const identity = await requireAdminPage();
  const settings = await listSystemSettings.execute(toAuthenticatedActor(identity));
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Cài đặt hệ thống" description="Quản lý hướng dẫn thanh toán công khai và theo dõi metadata cấu hình hệ thống." />
      <SystemSettingManagementPanel initialItems={settings.map((item) => ({
        ...item,
        updatedAt: item.updatedAt.toISOString(),
      }))} />
    </div>
  );
}
