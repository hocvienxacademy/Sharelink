import type { ReactNode } from "react";
import { requireAdminPage } from "@/modules/auth/presentation/require-admin-page";
import { AdminShell } from "@/modules/dashboard/presentation/ui/admin-shell";

export default async function AdminLayout({ children }: { readonly children: ReactNode }) {
  const identity = await requireAdminPage();
  return <AdminShell identity={identity}>{children}</AdminShell>;
}
