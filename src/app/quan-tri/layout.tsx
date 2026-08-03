import type { ReactNode } from "react";
import { requireStaffPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminShell } from "@/modules/dashboard/presentation/ui/admin-shell";

export default async function AdminLayout({ children }: { readonly children: ReactNode }) {
  const identity = await requireStaffPage();
  return <AdminShell identity={identity}>{children}</AdminShell>;
}
