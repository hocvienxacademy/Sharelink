import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";
import type { StaffIdentity } from "@/modules/auth";
import { LogoutButton } from "@/modules/auth/presentation/ui/logout-button";
import { AdminDesktopNavigation, AdminMobileNavigation } from "./admin-navigation";

export function AdminShell({
  children,
  identity,
}: {
  readonly children: ReactNode;
  readonly identity: StaffIdentity;
}) {
  return (
    <main className="min-h-dvh bg-surface">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/quan-tri" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheckIcon aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold tracking-tight">
                ShareLink<span className="text-brand-coral-text">Student</span>
              </span>
              <span className="block text-xs text-muted-foreground">Control Center</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{identity.fullName}</p>
              <p className="text-xs text-muted-foreground">{identity.role}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <AdminMobileNavigation role={identity.role} />

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <AdminDesktopNavigation role={identity.role} />
        <div className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </div>
    </main>
  );
}
