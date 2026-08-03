import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { formatDateTime, formatMoney } from "@/modules/dashboard/presentation/format-admin-value";
import { listAdminRegistrationLinks } from "@/modules/registration-links";

export const dynamic = "force-dynamic";

export default async function RegistrationLinksPage() {
  await requireAdminPage();
  const links = await listAdminRegistrationLinks();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Liên kết đăng ký"
        description="Theo dõi tối đa 100 liên kết mới nhất mà không đưa public token ra bảng tổng quan."
        action={
          <Button nativeButton={false} render={<Link href="/quan-tri/lien-ket/tao-moi" />}>
            <PlusIcon data-icon="inline-start" />Tạo liên kết
          </Button>
        }
      />
      <AdminResourceTable
        columns={[
          { key: "student", label: "Sinh viên" },
          { key: "status", label: "Trạng thái" },
          { key: "sale", label: "Phụ trách" },
          { key: "period", label: "Kỳ / ngành" },
          { key: "tuition", label: "Học phí" },
          { key: "created", label: "Ngày tạo" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có liên kết đăng ký trong cơ sở dữ liệu."
        rows={links.map((item) => ({
          id: item.id,
          student: item.studentNameHint ?? "Chưa nhập gợi ý",
          status: <AdminStatusBadge status={item.status} />,
          sale: item.saleName,
          period: <span className="block max-w-64 whitespace-normal">{item.admissionPeriod}<br />{item.major}</span>,
          tuition: formatMoney(item.tuitionAmount),
          created: formatDateTime(item.createdAt),
          action: (
            <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={`/quan-tri/lien-ket/${item.id}`} />}>
              Chi tiết<ArrowRightIcon data-icon="inline-end" />
            </Button>
          ),
        }))}
      />
    </div>
  );
}
