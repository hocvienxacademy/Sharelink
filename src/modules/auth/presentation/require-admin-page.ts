import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  type AdminIdentity,
  type StaffIdentity,
} from "../index";
import { getAdminIdentityBySessionToken } from "@/composition/auth";

export async function requireStaffPage(): Promise<StaffIdentity> {
  const cookieStore = await cookies();
  const identity = await getAdminIdentityBySessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (identity === null) redirect("/dang-nhap");
  return identity;
}

export async function requireAdminPage(): Promise<AdminIdentity> {
  const identity = await requireStaffPage();
  if (identity.role !== "ADMIN") redirect("/quan-tri/lien-ket");
  return identity;
}
