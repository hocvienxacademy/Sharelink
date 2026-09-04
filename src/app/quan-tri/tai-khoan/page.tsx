import { notFound } from "next/navigation";
import { queryUsers } from "@/composition/users";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { StaffAccountPanel } from "@/modules/users/presentation/ui/staff-account-panel";
import { toAuthenticatedActor } from "@/shared/authorization";

export const dynamic = "force-dynamic";

export default async function StaffAccountPage() {
  const identity = await requireStaffPage();
  const user = await queryUsers.detail(toAuthenticatedActor(identity), identity.id);
  if (user === null) notFound();
  return <div className="flex flex-col gap-8">
    <AdminPageHeader title="Tài khoản của tôi" description="Quản lý thông tin cá nhân và bảo mật tài khoản." />
    <StaffAccountPanel user={user} />
  </div>;
}
