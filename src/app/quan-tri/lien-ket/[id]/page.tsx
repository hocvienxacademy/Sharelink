import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { toAuthenticatedActor } from "@/shared/authorization";
import { AdminDetailGrid } from "@/modules/dashboard/presentation/ui/admin-detail-grid";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { registrationLinkQueries } from "@/composition/registration-links";
import { listAdminMajors } from "@/modules/catalogs";
import { listActiveSaleOptions } from "@/modules/users";
import { RegistrationLinkActions } from "@/modules/registration-links/presentation/ui/registration-link-actions";
import { RegistrationLinkForm } from "@/modules/registration-links/presentation/ui/registration-link-form";

export const dynamic = "force-dynamic";

const relatedLabel = (value: { readonly code: string; readonly name: string } | null) =>
  value === null ? "Chưa gán" : `${value.code} — ${value.name}`;

export default async function RegistrationLinkDetailPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const identity = await requireStaffPage();
  const { id } = await params;
  const item = await registrationLinkQueries.detail(toAuthenticatedActor(identity), id);
  if (item === null) notFound();
  const canMutate = identity.role === "ADMIN" || (identity.role === "SALE" && item.saleId === identity.id);
  const editOptions = canMutate && item.status === "DRAFT" && item.applicationId === null
    ? await Promise.all([
        identity.role === "ADMIN"
          ? listActiveSaleOptions()
          : Promise.resolve([{ id: identity.id, fullName: identity.fullName, username: identity.username }]),
        listAdminMajors(),
      ])
    : null;
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        parent={{ href: "/quan-tri/lien-ket", label: "Liên kết" }}
        title={item.studentNameHint ?? "Chi tiết liên kết"}
        description="Quản lý thông tin, trạng thái và lịch sử của liên kết đăng ký."
        action={item.applicationId === null ? null : (
          <Button nativeButton={false} variant="outline" render={<Link href={`/quan-tri/ho-so/${item.applicationId}`} />}>
            Mở hồ sơ
          </Button>
        )}
      />
      <AdminDetailGrid
        title="Thông tin liên kết"
        items={[
          { label: "Trạng thái", value: <AdminStatusBadge status={item.status} /> },
          { label: "SALE phụ trách", value: item.saleName },
          ...(item.admissionPeriod === null ? [] : [{ label: "Kỳ lịch sử", value: relatedLabel(item.admissionPeriod) }]),
          { label: "Ngành", value: relatedLabel(item.major) },
          { label: "Đợt thanh toán", value: item.paymentRound },
          { label: "Ngày tạo", value: formatDateTime(item.createdAt) },
          { label: "Hết hạn", value: formatDateTime(item.expiresAt) },
          { label: "Lần truy cập", value: item.accessCount },
        ]}
      />
      <RegistrationLinkActions id={item.id} status={item.status} applicationId={item.applicationId} publicUrl={item.publicUrl} updatedAtIso={item.updatedAtIso} canMutate={canMutate} />
      {editOptions === null ? null : (
        <RegistrationLinkForm
          linkId={item.id}
          initial={item}
          sales={editOptions[0].map((value) => ({ id: value.id, label: `${value.fullName} (${value.username})` }))}
          majors={editOptions[1].filter((value) => value.isActive).map((value) => ({ id: value.id, label: `${value.code} — ${value.name}` }))}
        />
      )}
      <AdminResourceTable
        columns={[
          { key: "transition", label: "Chuyển trạng thái" },
          { key: "actor", label: "Người thực hiện" },
          { key: "reason", label: "Lý do" },
          { key: "time", label: "Thời gian" },
        ]}
        emptyDescription="Liên kết chưa có lịch sử trạng thái."
        rows={item.histories.map((history, index) => ({
          id: `${index}`,
          transition: `${history.previousStatus ?? "Khởi tạo"} → ${history.newStatus}`,
          actor: history.actorName,
          reason: history.reason ?? "—",
          time: formatDateTime(history.createdAt),
        }))}
      />
    </div>
  );
}
