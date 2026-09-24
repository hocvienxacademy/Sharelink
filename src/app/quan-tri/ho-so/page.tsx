import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { staffApplicationQueries } from "@/composition/applications";
import { queryManagedCatalogs } from "@/composition/catalogs";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { toAuthenticatedActor } from "@/shared/authorization";
import { formatDateTime } from "@/modules/dashboard/presentation/format-admin-value";
import { AdminPageHeader } from "@/modules/dashboard/presentation/ui/admin-page-header";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { AdminStatusBadge } from "@/modules/dashboard/presentation/ui/admin-status-badge";
import { ApplicationFeeStatusBadge } from "@/modules/applications/presentation/ui/application-fee-status-badge";
import { ApplicationListFilters } from "@/modules/applications/presentation/ui/application-list-filters";
import { parseStaffApplicationListFilter } from "@/modules/applications/application/validation/staff-application-list-filter";

export const dynamic = "force-dynamic";

type ApplicationsPageSearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;

export default async function ApplicationsPage({
  searchParams,
}: {
  readonly searchParams: Promise<ApplicationsPageSearchParams>;
}) {
  const identity = await requireStaffPage();
  const actor = toAuthenticatedActor(identity);
  const parsedFilter = parseStaffApplicationListFilter(await searchParams);
  const [applications, majors] = await Promise.all([
    staffApplicationQueries.list(actor, parsedFilter.filter, parsedFilter.search),
    queryManagedCatalogs.listMajors(actor),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Hồ sơ sinh viên" description="Danh sách 100 hồ sơ mới nhất trong phạm vi bạn được phân quyền." />
      <ApplicationListFilters
        initialState={parsedFilter.state}
        majors={majors.map((major) => ({
          id: major.id,
          code: major.code,
          name: major.name,
          isActive: major.isActive,
        }))}
        serverError={parsedFilter.error}
      />
      <AdminResourceTable
        columns={[
          { key: "phone", label: "Số điện thoại" },
          { key: "student", label: "Sinh viên" },
          { key: "status", label: "Trạng thái" },
          { key: "applicationFee", label: "Lệ phí" },
          { key: "emailStatus", label: "Email" },
          { key: "sale", label: "Phụ trách" },
          { key: "major", label: "Ngành" },
          { key: "submitted", label: "Ngày nộp" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có hồ sơ sinh viên trong cơ sở dữ liệu."
        rows={applications.map((item) => ({
          id: item.id,
          phone: item.phone ?? "Chưa nhập",
          student: item.fullName ?? "Chưa nhập họ tên",
          status: <AdminStatusBadge status={item.status} />,
          applicationFee: <ApplicationFeeStatusBadge iconOnly status={item.applicationFeeTransferStatus} />,
          emailStatus: <AdminStatusBadge status={item.submissionEmailStatus} />,
          sale: item.saleName,
          major: item.major,
          submitted: formatDateTime(item.submittedAt),
          action: (
            <Button nativeButton={false} size="sm" variant="ghost" render={<Link href={`/quan-tri/ho-so/${item.id}`} />}>
              Xem<ArrowRightIcon data-icon="inline-end" />
            </Button>
          ),
        }))}
      />
    </div>
  );
}
