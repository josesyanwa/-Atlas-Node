import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { useAuthSession } from "@/hooks/api/use-auth";
import { useMyPendingInvites } from "@/hooks/api/use-invites";
import { useMyClientPortalInvites } from "@/hooks/api/use-client-portal";

/**
 * Page-body takeover for a user who belongs to no organization. Every
 * org-scoped query is `enabled: !!orgId`, so without this those pages sit on a
 * loader that never resolves. See `app-shell.tsx` for the gate condition and
 * the routes exempt from it.
 */
export function NoOrganizationGate() {
  const session = useAuthSession();
  const userId = session.data?.data?.user.id;
  const { data } = useMyPendingInvites(userId);
  const clientInvites = useMyClientPortalInvites(userId);
  const inviteCount = data?.data?.length ?? 0;
  const clientInviteCount = clientInvites.data?.data?.length ?? 0;

  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-5 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
        <Building2 className="size-6 text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome to Atlas Node
        </h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Create a firm workspace to manage clients and teammates. If an
          accounting team invited you as a client, open your client portal
          instead.
        </p>
      </div>

      <Button asChild variant="outline">
        <Link to="/client-portal">Open client portal</Link>
      </Button>

      <Card className="w-full max-w-md text-left">
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>

      {inviteCount > 0 ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          Waiting on a teammate instead? You have{" "}
          <b>
            {inviteCount} pending invite{inviteCount === 1 ? "" : "s"}
          </b>{" "}
          —{" "}
          <Link
            to="/invites"
            className="font-medium text-foreground underline underline-offset-4"
          >
            review {inviteCount === 1 ? "it" : "them"}
          </Link>
          .
        </p>
      ) : null}

      {clientInviteCount > 0 ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          You also have{" "}
          <b>
            {clientInviteCount} client portal invitation
            {clientInviteCount === 1 ? "" : "s"}
          </b>{" "}
          —{" "}
          <Link
            to="/client-portal"
            className="font-medium text-foreground underline underline-offset-4"
          >
            review {clientInviteCount === 1 ? "it" : "them"}
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
