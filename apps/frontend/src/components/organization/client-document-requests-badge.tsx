import { Link } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/api/use-auth";
import {
  useClientPortalRequests,
  useMyClientPortalAccess,
} from "@/hooks/api/use-client-portal";

export function ClientDocumentRequestsBadge() {
  const session = useAuthSession();
  const userId = session.data?.data?.user.id;
  const portalAccess = useMyClientPortalAccess(userId);
  const hasClientPortalAccess = portalAccess.data?.data.hasAccess === true;
  const requests = useClientPortalRequests({
    enabled: hasClientPortalAccess,
    refetchInterval: hasClientPortalAccess ? 30_000 : false,
  });
  const count =
    requests.data?.data.filter((request) => request.status === "requested")
      .length ?? 0;

  if (count === 0) return null;

  const label = `${count} document request${count === 1 ? "" : "s"} waiting for you`;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={label}
      title={label}
    >
      <Link to="/client-portal">
        <BellRing className="size-4" />
        <span className="absolute -top-0.5 -right-0.5 rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {count}
        </span>
      </Link>
    </Button>
  );
}
