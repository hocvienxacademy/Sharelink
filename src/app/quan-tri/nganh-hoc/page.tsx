import { queryManagedCatalogs } from "@/composition/catalogs";
import { toAuthenticatedActor } from "@/shared/authorization";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { MajorManagementPanel } from "@/modules/catalogs/presentation/ui/catalog-management-panels";

export const dynamic = "force-dynamic";

export default async function MajorsPage() {
  const identity = await requireStaffPage();
  const majors = await queryManagedCatalogs.listMajors(toAuthenticatedActor(identity));
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Ngành học" description="Danh mục ngành hiển thị cho biểu mẫu đăng ký sinh viên." />
      <MajorManagementPanel canManage={identity.role === "ADMIN"} initialItems={majors.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }))} />
    </div>
  );
}
