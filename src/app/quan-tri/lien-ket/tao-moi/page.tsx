import { redirect } from "next/navigation";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { listAdminMajors } from "@/modules/catalogs";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { listActiveSaleOptions } from "@/modules/users";
import { RegistrationLinkForm } from "@/modules/registration-links/presentation/ui/registration-link-form";

export const dynamic = "force-dynamic";

export default async function CreateRegistrationLinkPage() {
  const identity = await requireStaffPage();
  if (identity.role === "MANAGER") redirect("/quan-tri/lien-ket");
  const [majors, sales] = await Promise.all([
    listAdminMajors(),
    identity.role === "ADMIN"
      ? listActiveSaleOptions()
      : Promise.resolve([{ id: identity.id, fullName: identity.fullName, username: identity.username }]),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        parent={{ href: "/quan-tri/lien-ket", label: "Liên kết" }}
        title="Tạo liên kết"
        description="Tạo liên kết đăng ký mới cho SALE phụ trách."
      />
      <RegistrationLinkForm
        sales={sales.map((item) => ({ id: item.id, label: `${item.fullName} (${item.username})` }))}
        lockSaleSelection={identity.role === "SALE"}
        majors={majors.filter((item) => item.isActive).map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` }))}
      />
    </div>
  );
}
