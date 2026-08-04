import { queryManagedBankAccounts } from "@/composition/catalogs";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { toAuthenticatedActor } from "@/shared/authorization";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { BankAccountManagementPanel } from "@/modules/catalogs/presentation/ui/bank-account-management-panel";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  const identity = await requireStaffPage();
  const accounts = await queryManagedBankAccounts.list(toAuthenticatedActor(identity));
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Tài khoản ngân hàng" description="Quản lý danh mục nhận thanh toán và tài khoản mặc định hiển thị trong đăng ký." />
      <BankAccountManagementPanel canManage={identity.role === "ADMIN"} initialItems={accounts.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }))} />
    </div>
  );
}
