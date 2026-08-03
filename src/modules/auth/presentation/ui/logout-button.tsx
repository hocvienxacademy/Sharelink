"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/dang-nhap");
        router.refresh();
      }}
    >
      <LogOutIcon data-icon="inline-start" />
      Đăng xuất
    </Button>
  );
}
