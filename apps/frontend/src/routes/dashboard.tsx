import {
  Activity,
  ArrowUpRight,
  Database,
  Download,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonList } from "@/components/shared/skeleton-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useCurrentOrganization,
  useStartEnterpriseExport,
} from "@/hooks/api/use-organizations";
import { useCurrentOrganizationMembers } from "@/hooks/api/use-members";
import { extractErrorMessage } from "@/lib/extract-error";

const SAMPLE_STORAGE_USED_BYTES = 2.4 * 1024 ** 3;
const SAMPLE_API_REQUESTS = 24_680;

const sampleActivity = [
  {
    actor: "Jordan Lee",
    action: "Invited a new team member",
    target: "alex.morgan@example.com",
    time: "2 minutes ago",
    category: "Team",
  },
  {
    actor: "Alex Morgan",
    action: "Updated workspace settings",
    target: "Security",
    time: "18 minutes ago",
    category: "Settings",
  },
  {
    actor: "Sam Rivera",
    action: "Created an API key",
    target: "Production",
    time: "1 hour ago",
    category: "API",
  },
  {
    actor: "Jordan Lee",
    action: "Changed subscription plan",
    target: "Pro",
    time: "Yesterday",
    category: "Billing",
  },
];

function formatStorage(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
}

export function DashboardPage() {
  const current = useCurrentOrganization();
  const members = useCurrentOrganizationMembers();
  const exportMutation = useStartEnterpriseExport();
  const org = current.data?.data.organization;
  const callerRole = current.data?.data.role;

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

  if (current.isPending || members.isPending || !org) {
    return (
      <div className="mx-auto max-w-6xl py-6">
        <SkeletonList rows={4} rowHeight={120} />
      </div>
    );
  }

  const memberCount = members.data?.data.length ?? 0;
  const usagePercent = Math.min(
    100,
    Math.round((SAMPLE_STORAGE_USED_BYTES / org.usageQuotaBytes) * 100),
  );
  const canRunEnterpriseAction =
    callerRole === "owner" || callerRole === "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      <PageHeader
        title={`Welcome back, ${org.name}`}
        description="A snapshot of your organization’s workspace and activity."
        eyebrow="Organization overview"
      />

      <section
        aria-label="Organization metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Active members</CardDescription>
            <Users
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{memberCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Members in this organization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Storage used</CardDescription>
            <Database
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatStorage(SAMPLE_STORAGE_USED_BYTES)}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sample usage of {formatStorage(org.usageQuotaBytes)} quota
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>API requests</CardDescription>
            <Activity
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {SAMPLE_API_REQUESTS.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sample volume over the last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Subscription tier</CardDescription>
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
              Organization’s current plan
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Enterprise data export</CardTitle>
            <CardDescription className="mt-1">
              Preview a plan-gated workflow for organization administrators.
            </CardDescription>
          </div>
          <Badge
            variant={
              org.activeSubscriptionPlan === "free" ? "outline" : "secondary"
            }
          >
            {org.activeSubscriptionPlan === "free"
              ? "Pro or Enterprise"
              : `${org.activeSubscriptionPlan} enabled`}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-sm text-muted-foreground">
            This prototype action is available on Pro and Enterprise plans. The
            export is mocked; no file is generated.
          </p>
          <Button
            variant="outline"
            disabled={!canRunEnterpriseAction || exportMutation.isPending}
            onClick={() =>
              exportMutation.mutate(undefined, {
                onSuccess: (response) => toast.success(response.data.message),
                onError: (error) => toast.error(extractErrorMessage(error)),
              })
            }
          >
            <Download className="size-4" aria-hidden="true" />
            {exportMutation.isPending ? "Starting..." : "Try data export"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription className="mt-1">
                Sample organization events for the dashboard prototype.
              </CardDescription>
            </div>
            <Badge variant="outline">Sample data</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleActivity.map((event) => (
                <TableRow key={`${event.actor}-${event.action}-${event.time}`}>
                  <TableCell>
                    <p className="font-medium">{event.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.actor} · {event.target}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{event.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.time}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
