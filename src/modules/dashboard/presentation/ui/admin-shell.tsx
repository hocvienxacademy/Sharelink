import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
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
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <Link href="/quan-tri" className="flex items-center gap-3">
            <span>
              <BrandLogo imageClassName="size-10 sm:size-11" textClassName="hidden sm:inline" />
              <span className="hidden text-xs text-muted-foreground sm:block">Control Center</span>
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
        <div className="min-w-0 px-3 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </div>
    </main>
  );
}
