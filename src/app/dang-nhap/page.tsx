import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE } from "@/modules/auth";
import { AdminLoginForm } from "@/modules/auth/presentation/ui/admin-login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const identity = await getAdminIdentityBySessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (identity !== null) {
    redirect(identity.role === "ADMIN" ? "/quan-tri" : "/quan-tri/lien-ket");
  }

  return (
    <main className="min-h-dvh bg-surface px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            ShareLink<span className="text-brand-coral-text">Student</span>
          </Link>
          <Button nativeButton={false} variant="ghost" render={<Link href="/" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            Trang chủ
          </Button>
        </nav>

        <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative hidden min-h-160 overflow-hidden rounded-[2rem] bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 size-72 rounded-full bg-brand-coral blur-3xl" />
            <div className="absolute -bottom-28 left-10 size-80 rounded-full bg-brand-blue opacity-70 blur-3xl" />
            <div className="relative flex items-center gap-2 text-sm font-medium">
              <ShieldCheckIcon aria-hidden="true" />
              Khu vực vận hành bảo mật
            </div>
            <div className="relative max-w-xl">
              <p className="mb-5 text-sm font-medium text-primary-foreground/70">
                SHARELINKSTUDENT CONTROL CENTER
              </p>
              <h1 className="font-heading text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">
                Quản lý tuyển sinh trong một không gian tập trung.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-primary-foreground/70">
                Theo dõi hồ sơ, liên kết đăng ký và tiến độ tiếp nhận với quyền truy cập dành riêng cho quản trị viên.
              </p>
            </div>
          </section>

          <Card className="justify-center rounded-[2rem] px-2 py-8 sm:px-8 lg:py-14">
            <CardHeader className="gap-3">
              <p className="text-sm font-semibold text-foreground">QUẢN TRỊ HỆ THỐNG</p>
              <CardTitle className="text-3xl font-semibold tracking-[-0.03em]">
                Chào mừng trở lại
              </CardTitle>
              <CardDescription className="text-base leading-6">
                Đăng nhập bằng tài khoản quản trị được cấp để tiếp tục.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-4">
              <AdminLoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
