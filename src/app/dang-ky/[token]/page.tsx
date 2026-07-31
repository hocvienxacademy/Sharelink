import { RegistrationFormShell } from "@/modules/applications/presentation/ui/registration-form-shell";

export default async function RegistrationPage({
  params,
}: {
  readonly params: Promise<{ readonly token: string }>;
}) {
  const { token } = await params;

  return <RegistrationFormShell token={token} />;
}
