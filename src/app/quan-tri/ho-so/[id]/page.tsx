import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { staffApplicationQueries } from "@/composition/applications";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { toAuthenticatedActor } from "@/shared/authorization";
import { formatDate, formatDateTime, formatMoney } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminDetailGrid } from "@/modules/dashboard/presentation/ui/admin-detail-grid";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { BusinessRuleGate } from "@/modules/dashboard/presentation/ui/business-rule-gate";
import { StaffApplicationActions } from "@/modules/applications/presentation/ui/staff-application-actions";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const identity = await requireStaffPage();
  const { id } = await params;
  const item = await staffApplicationQueries.detail(toAuthenticatedActor(identity), id);
  if (item === null) notFound();
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        parent={{ href: "/quan-tri/ho-so", label: "Hồ sơ" }}
        title={item.fullName ?? "Chi tiết hồ sơ"}
        description={`Mã hồ sơ: ${item.applicationCode ?? item.id.slice(0, 8)}`}
        action={item.payment === null ? null : (
          <Button nativeButton={false} variant="outline" render={<Link href={`/quan-tri/thanh-toan/${item.payment.id}`} />}>
            Mở thanh toán
          </Button>
        )}
      />
      <AdminDetailGrid
        title="Tổng quan xử lý"
        items={[
          { label: "Trạng thái", value: <AdminStatusBadge status={item.status} /> },
          { label: "SALE phụ trách", value: item.saleName },
          { label: "Người xét duyệt", value: item.reviewerName },
          { label: "Ngày nộp", value: formatDateTime(item.submittedAt) },
          { label: "Ngày xét duyệt", value: formatDateTime(item.reviewedAt) },
          { label: "Thanh toán", value: item.payment === null ? "Chưa có" : <><AdminStatusBadge status={item.payment.status} /> {formatMoney(item.payment.amount)}</> },
        ]}
      />
      <AdminDetailGrid
        title="Thông tin sinh viên"
        description="CCCD được che mặc định; địa chỉ chỉ hiển thị trạng thái đã khai báo để giảm lộ PII."
        items={[
          { label: "Họ và tên", value: item.fullName },
          { label: "Ngày sinh", value: formatDate(item.dateOfBirth) },
          { label: "Giới tính", value: item.gender },
          { label: "CCCD", value: item.maskedCitizenId },
          { label: "Điện thoại", value: item.phone },
          { label: "Email", value: item.email },
          { label: "Địa chỉ thường trú", value: item.permanentAddressProvided ? "Đã khai báo" : "Chưa khai báo" },
          { label: "Địa chỉ liên hệ", value: item.contactAddressProvided ? "Đã khai báo" : "Chưa khai báo" },
        ]}
      />
      <AdminDetailGrid
        title="Học vấn và xét tuyển"
        items={[
          { label: "Kỳ tuyển sinh", value: item.admissionPeriod },
          { label: "Ngành", value: item.major },
          { label: "Đối tượng đầu vào", value: item.entryQualification },
          { label: "Bằng xét tuyển", value: item.admissionDiploma },
          { label: "Ngành tốt nghiệp", value: item.graduateMajor },
          { label: "Năm tốt nghiệp", value: item.graduationYear },
          { label: "Trường THPT", value: item.highSchoolName },
          { label: "Xác nhận cam kết", value: item.declarationConfirmed ? "Có" : "Không" },
          { label: "Đồng ý xử lý dữ liệu", value: item.dataProcessingConsent ? "Có" : "Không" },
        ]}
      />
      <AdminResourceTable
        columns={[
          { key: "position", label: "Thứ tự" },
          { key: "fullName", label: "Họ và tên" },
          { key: "relationship", label: "Quan hệ" },
        ]}
        emptyDescription="Hồ sơ chưa khai báo người thân."
        rows={item.relatives.map((relative) => ({
          id: relative.position,
          position: relative.position,
          fullName: relative.fullName ?? "—",
          relationship: relative.relationship ?? "—",
        }))}
      />
      <StaffApplicationActions
        canManage={identity.role !== "SALE"}
        email={item.email}
        fullName={item.fullName}
        id={item.id}
        phone={item.phone}
        status={item.status}
        version={item.version}
      />
      {identity.role === "SALE" ? (
        <BusinessRuleGate>
          SALE có thể xem và tải phiếu Word của hồ sơ mình phụ trách, nhưng không thể chỉnh sửa hoặc xét duyệt.
        </BusinessRuleGate>
      ) : null}
      <AdminResourceTable
        columns={[
          { key: "transition", label: "Chuyển trạng thái" },
          { key: "actor", label: "Người thực hiện" },
          { key: "reason", label: "Lý do" },
          { key: "time", label: "Thời gian" },
        ]}
        emptyDescription="Hồ sơ chưa có lịch sử trạng thái."
        rows={item.histories.map((history) => ({
          id: history.id,
          transition: `${history.previousStatus ?? "Khởi tạo"} → ${history.newStatus}`,
          actor: history.actorName,
          reason: history.reason ?? "—",
          time: formatDateTime(history.createdAt),
        }))}
      />
    </div>
  );
}
