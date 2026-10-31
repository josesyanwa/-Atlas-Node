import { Link } from "@tanstack/react-router";
import { Bell, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/api/use-auth";
import { useMyPendingInvites } from "@/hooks/api/use-invites";
import { useMyClientPortalInvites } from "@/hooks/api/use-client-portal";

export function PendingInvitesBadge() {
  const session = useAuthSession();
  const userId = session.data?.data?.user.id;
  const { data } = useMyPendingInvites(userId);
  const clientInvites = useMyClientPortalInvites(userId);
  const count = data?.data?.length ?? 0;
  const clientInviteCount = clientInvites.data?.data?.length ?? 0;

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Organization invitations"
      >
        <Link to="/invites">
          <Bell className="size-4" />
          {count > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          ) : null}
        </Link>
      </Button>
      {clientInviteCount > 0 ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Client portal invitations"
        >
          <Link to="/client-portal">
            <MailCheck className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {clientInviteCount}
            </span>
          </Link>
        </Button>
      ) : null}
    </>
  );
}
