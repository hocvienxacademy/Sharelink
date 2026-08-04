import { queryManagedCatalogs } from "@/composition/catalogs";
import { toAuthenticatedActor } from "@/shared/authorization";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdmissionPeriodManagementPanel } from "@/modules/catalogs/presentation/ui/catalog-management-panels";

export const dynamic = "force-dynamic";

export default async function AdmissionPeriodsPage() {
  const identity = await requireStaffPage();
  const periods = await queryManagedCatalogs.listAdmissionPeriods(toAuthenticatedActor(identity));
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Kỳ tuyển sinh" description="Danh mục kỳ tiếp nhận được liên kết với hồ sơ và registration link." />
      <AdmissionPeriodManagementPanel canManage={identity.role === "ADMIN"} initialItems={periods.map((item) => ({ ...item, startDate: item.startDate?.toISOString() ?? null, endDate: item.endDate?.toISOString() ?? null, updatedAt: item.updatedAt.toISOString() }))} />
    </div>
  );
}
