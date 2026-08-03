import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";

export interface AdminDashboardMetrics {
  readonly activeStaff: number;
  readonly applications: number;
  readonly registrationLinks: number;
  readonly submittedApplications: number;
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const [activeStaff, registrationLinks, applications, submittedApplications] =
    await prisma.$transaction([
      prisma.users.count({ where: { is_active: true } }),
      prisma.registration_links.count(),
      prisma.applications.count(),
      prisma.applications.count({ where: { status: { not: "DRAFT" } } }),
    ]);

  return {
    activeStaff,
    applications,
    registrationLinks,
    submittedApplications,
  };
}
