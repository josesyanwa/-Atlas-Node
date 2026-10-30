import { ArrowUpRight, Database, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonList } from "@/components/shared/skeleton-list";
import { RoleBadge } from "@/components/organization/role-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentOrganization } from "@/hooks/api/use-organizations";
import { useCurrentOrganizationMembers } from "@/hooks/api/use-members";
import { extractErrorMessage } from "@/lib/extract-error";

function formatStorageQuota(bytes: number): string {
  const gibibytes = bytes / 1024 ** 3;
  if (gibibytes >= 1024) {
    return `${(gibibytes / 1024).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })} TiB`;
  }
  return `${gibibytes.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} GiB`;
}

function formatJoinDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function DashboardPage() {
  const current = useCurrentOrganization();
  const members = useCurrentOrganizationMembers();
  const org = current.data?.data.organization;
  const organizationMembers = members.data?.data;

  if (current.isError || members.isError) {
    return (
      <div
        className="mx-auto max-w-6xl py-6 text-sm text-destructive"
        role="alert"
      >
        {extractErrorMessage(current.error ?? members.error)}
      </div>
    );
  }

  if (current.isPending || members.isPending || !org || !organizationMembers) {
    return (
      <div className="mx-auto max-w-6xl py-6">
        <SkeletonList rows={4} rowHeight={120} />
      </div>
    );
  }

  const roleCounts = organizationMembers.reduce(
    (counts, member) => {
      counts[member.role] += 1;
      return counts;
    },
    { owner: 0, admin: 0, viewer: 0 },
  );
  const recentMembers = [...organizationMembers]
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      <PageHeader
        title={org.name}
        description="A current overview of your organization."
        eyebrow="Dashboard"
      />

      <section
        aria-label="Organization metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Organization members</CardDescription>
            <Users
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {organizationMembers.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {roleCounts.owner} owner · {roleCounts.admin} admin ·{" "}
              {roleCounts.viewer} viewer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Storage quota</CardDescription>
            <Database
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatStorageQuota(org.usageQuotaBytes)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Organization limit; storage consumption is not tracked yet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Subscription plan</CardDescription>
            <ArrowUpRight
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold capitalize">
              {org.activeSubscriptionPlan}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Current organization plan
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recently joined members</CardTitle>
              <CardDescription className="mt-1">
                Latest members from the current organization roster.
              </CardDescription>
            </div>
            <Badge variant="outline">Live organization data</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {recentMembers.length === 0 ? (
            <EmptyState
              title="No organization members"
              description="Members will appear here when they join this organization."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.user.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatJoinDate(member.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
