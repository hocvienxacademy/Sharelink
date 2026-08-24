import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { toAuthenticatedActor } from "@/shared/authorization";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { registrationLinkQueries } from "@/composition/registration-links";

const relatedLabel = (value: { readonly code: string; readonly name: string } | null) =>
  value === null ? "Chưa gán" : `${value.code} — ${value.name}`;

export const dynamic = "force-dynamic";

export default async function RegistrationLinksPage({ searchParams }: { readonly searchParams: Promise<{ readonly archived?: string }> }) {
  const identity = await requireStaffPage();
  const includeArchived = identity.role !== "MANAGER" && (await searchParams).archived === "true";
  const links = await registrationLinkQueries.list(toAuthenticatedActor(identity), includeArchived);
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Liên kết đăng ký"
        description="Theo dõi tối đa 100 liên kết mới nhất mà không đưa public token ra bảng tổng quan."
        action={identity.role === "ADMIN" || identity.role === "SALE" ? (
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} variant="outline" render={<Link href={includeArchived ? "/quan-tri/lien-ket" : "/quan-tri/lien-ket?archived=true"} />}>
              {includeArchived ? "Ẩn đã lưu trữ" : "Xem đã lưu trữ"}
            </Button>
            <Button nativeButton={false} render={<Link href="/quan-tri/lien-ket/tao-moi" />}>
              <PlusIcon data-icon="inline-start" />Tạo liên kết
            </Button>
          </div>
        ) : null}
      />
      <AdminResourceTable
        columns={[
          { key: "student", label: "Sinh viên" },
          { key: "status", label: "Trạng thái" },
          { key: "sale", label: "Phụ trách" },
          { key: "major", label: "Ngành" },
          { key: "created", label: "Ngày tạo" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có liên kết đăng ký trong cơ sở dữ liệu."
        rows={links.map((item) => ({
          id: item.id,
          student: item.studentNameHint ?? "Chưa nhập gợi ý",
          status: <AdminStatusBadge status={item.status} />,
          sale: item.saleName,
          major: <span className="block max-w-64 whitespace-normal">{relatedLabel(item.major)}</span>,
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
