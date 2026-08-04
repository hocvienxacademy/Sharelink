"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknoteIcon,
  BookOpenIcon,
  Building2Icon,
  ClipboardListIcon,
  FileTextIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  Link2Icon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/modules/users";

interface NavigationItem {
  readonly href: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly label: string;
}

const navigationItems: readonly NavigationItem[] = [
  { href: "/quan-tri", label: "Tổng quan", icon: LayoutDashboardIcon },
  { href: "/quan-tri/lien-ket", label: "Liên kết", icon: Link2Icon },
  { href: "/quan-tri/ho-so", label: "Hồ sơ", icon: FileTextIcon },
  { href: "/quan-tri/thanh-toan", label: "Thanh toán", icon: BanknoteIcon },
  { href: "/quan-tri/nhan-su", label: "Nhân sự", icon: UsersIcon },
  { href: "/quan-tri/ky-tuyen-sinh", label: "Kỳ tuyển sinh", icon: BookOpenIcon },
  { href: "/quan-tri/nganh-hoc", label: "Ngành học", icon: GraduationCapIcon },
  { href: "/quan-tri/tai-khoan-ngan-hang", label: "Ngân hàng", icon: Building2Icon },
  { href: "/quan-tri/cai-dat", label: "Cài đặt", icon: SettingsIcon },
  { href: "/quan-tri/nhat-ky", label: "Nhật ký", icon: ClipboardListIcon },
];

function isActiveRoute(pathname: string, href: string): boolean {
  return href === "/quan-tri"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({ onNavigate, role }: { readonly onNavigate?: () => void; readonly role: UserRole }) {
  const pathname = usePathname();
  const visibleItems = role === "ADMIN"
    ? navigationItems
    : navigationItems.filter((item) => [
        "/quan-tri/lien-ket",
        "/quan-tri/ho-so",
        "/quan-tri/thanh-toan",
        "/quan-tri/ky-tuyen-sinh",
        "/quan-tri/nganh-hoc",
        ...(role === "MANAGER" ? ["/quan-tri/nhan-su"] : []),
      ].includes(item.href));
  return visibleItems.map(({ href, icon: Icon, label }) => {
    const active = isActiveRoute(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
        {label}
      </Link>
    );
  });
}

export function AdminMobileNavigation({ role }: { readonly role: UserRole }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b bg-background px-4 py-3 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" size="icon-lg" aria-label="Mở điều hướng quản trị" />}>
          <MenuIcon aria-hidden="true" />
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Điều hướng quản trị</SheetTitle>
            <SheetDescription>Chọn khu vực vận hành cần mở.</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4" aria-label="Điều hướng quản trị mobile">
            <NavigationLinks role={role} onNavigate={() => setOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function AdminDesktopNavigation({ role }: { readonly role: UserRole }) {
  return (
    <aside className="hidden min-h-[calc(100dvh-73px)] border-r bg-background p-4 lg:block">
      <nav className="sticky top-4 flex flex-col gap-1" aria-label="Điều hướng quản trị">
        <NavigationLinks role={role} />
      </nav>
    </aside>
  );
}
