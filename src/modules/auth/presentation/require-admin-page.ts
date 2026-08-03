import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  type AdminIdentity,
} from "../index";
import { getAdminIdentityBySessionToken } from "@/composition/auth";

export async function requireAdminPage(): Promise<AdminIdentity> {
  const cookieStore = await cookies();
  const identity = await getAdminIdentityBySessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (identity === null) redirect("/dang-nhap");
  return identity;
}
