import { RegistrationFormShell } from "@/modules/applications/presentation/ui/registration-form-shell";

export default async function ExistingApplicationPage({
  params,
}: {
  readonly params: Promise<{
    readonly applicationId: string;
    readonly token: string;
  }>;
}) {
  const { applicationId, token } = await params;

  return (
    <RegistrationFormShell
      token={token}
      applicationId={applicationId}
    />
  );
}
