import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { listAdminBankAccounts } from "@/modules/catalogs";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  await requireAdminPage();
  const accounts = await listAdminBankAccounts();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Tài khoản ngân hàng" description="Tài khoản nhận tiền được che số trên giao diện tổng quan." />
      <BusinessRuleGate>
        Thêm, sửa và đặt mặc định chờ quy trình phê duyệt thay đổi thông tin nhận tiền; database chỉ cho phép một tài khoản mặc định.
      </BusinessRuleGate>
      <AdminResourceTable
        columns={[
          { key: "bank", label: "Ngân hàng" }, { key: "account", label: "Số tài khoản" },
          { key: "name", label: "Tên tài khoản" }, { key: "default", label: "Mặc định" },
          { key: "status", label: "Trạng thái" },
        ]}
        emptyDescription="Chưa có tài khoản ngân hàng."
        rows={accounts.map((item) => ({
          id: item.id,
          bank: `${item.bankCode} — ${item.bankName}`,
          account: item.maskedAccountNumber,
          name: item.accountName,
          default: item.isDefault ? <Badge>Mặc định</Badge> : "—",
          status: <Badge variant="secondary">{item.isActive ? "Hoạt động" : "Tạm dừng"}</Badge>,
        }))}
      />
    </div>
  );
}
