import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/api/use-auth";
import {
  useMyClientPortalAccess,
  useMyClientPortalInvites,
} from "@/hooks/api/use-client-portal";
import { useMyOrganizations } from "@/hooks/api/use-organizations";

export function HomePage() {
  const session = useAuthSession();
  const userId = session.data?.data?.user.id;
  const invitations = useMyClientPortalInvites(userId);
  const portalAccess = useMyClientPortalAccess(userId);
  const organizations = useMyOrganizations();
  const hasClientPortal =
    portalAccess.data?.data.hasAccess === true ||
    (invitations.data?.data.length ?? 0) > 0;
  const hasOrganization = (organizations.data?.data.length ?? 0) > 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-10">
      <Card>
        <CardHeader className="text-center">
          <img src="/logo.svg" alt="" className="mx-auto mb-2 size-14" />
          <CardTitle className="text-2xl">Welcome to Atlas Node</CardTitle>
          <CardDescription>
            {hasOrganization
              ? "Manage your organization and client work from one place."
              : "Your Atlas Node home. Open your client portal or create a firm workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {hasClientPortal ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p className="font-medium">Client portal</p>
                  <p className="text-sm text-muted-foreground">
                    View document requests and securely share files with your
                    accounting team.
                    {(invitations.data?.data.length ?? 0) > 0
                      ? ` You have ${invitations.data?.data.length} pending invitation${invitations.data?.data.length === 1 ? "" : "s"}.`
                      : ""}
                  </p>
                </div>
                <Button asChild>
                  <Link to="/client-portal">Open client portal</Link>
                </Button>
              </div>
            ) : null}
            {!hasOrganization ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p className="font-medium">Set up a firm workspace</p>
                  <p className="text-sm text-muted-foreground">
                    Create an organization to manage clients and invite
                    teammates.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/organizations/new">Create organization</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
