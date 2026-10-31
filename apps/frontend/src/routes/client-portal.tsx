import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import type { ClientDocumentRequest } from "@atlas-node/api-interfaces";
import { AuthThemeToggle } from "@/components/theme/auth-theme-toggle";
import { ClientDocumentRequestsBadge } from "@/components/organization/client-document-requests-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientPortalAPI } from "@/api/client-portal.api";
import {
  clearSignedOutUserState,
  useAuthSession,
  useSignOut,
} from "@/hooks/api/use-auth";
import {
  useAcceptClientPortalInvite,
  useAcceptClientInvite,
  useClientInvitePreview,
  useMyClientPortalInvites,
  useClientPortalRequests,
  useUploadClientDocument,
} from "@/hooks/api/use-client-portal";
import { extractErrorMessage } from "@/lib/extract-error";

const notifyError = (error: unknown) => toast.error(extractErrorMessage(error));

export function ClientPortalPage() {
  const requests = useClientPortalRequests();
  const session = useAuthSession();
  const clientInvites = useMyClientPortalInvites(session.data?.data?.user.id);
  const acceptClientInvite = useAcceptClientPortalInvite();
  const signOut = useSignOut();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const result = await signOut.mutateAsync();
      if (result.error) {
        throw new Error(result.error.message || "Unable to sign out.");
      }
      clearSignedOutUserState();
      await navigate({ to: "/sign-in" });
    } catch (error) {
      notifyError(error);
    }
  };

  const handleAcceptClientInvite = async (inviteId: string) => {
    try {
      await acceptClientInvite.mutateAsync(inviteId);
      toast.success("Invitation accepted. Your document history is ready.");
      await navigate({ to: "/client-portal/history" });
    } catch (error) {
      notifyError(error);
    }
  };

  return (
    <>
      <AuthThemeToggle />
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-4 py-10">
        <ClientPortalNavigation currentPage="home" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Atlas Node · Client portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Share documents with your accounting team
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your accounting team will list the documents they need here.
              Upload them securely and check what is still outstanding.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void handleSignOut()}
            disabled={signOut.isPending}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
        {clientInvites.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {extractErrorMessage(clientInvites.error)}
          </p>
        ) : null}
        {(clientInvites.data?.data.length ?? 0) > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Pending invitations</h2>
            {clientInvites.data?.data.map((invite) => (
              <Card key={invite.id}>
                <CardHeader>
                  <CardTitle>{invite.organizationName}</CardTitle>
                  <CardDescription>
                    {invite.organizationName} is asking you to share documents
                    with its accounting team. Accept this invitation to see
                    which documents they need from you. It was sent to{" "}
                    {invite.invitedEmail} and expires on{" "}
                    {new Date(invite.expiresAt).toLocaleDateString()}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => void handleAcceptClientInvite(invite.id)}
                    disabled={acceptClientInvite.isPending}
                  >
                    {acceptClientInvite.isPending
                      ? "Accepting…"
                      : "Accept invitation"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        ) : null}

        {requests.isPending ? (
          <p className="text-sm text-muted-foreground">Loading requests…</p>
        ) : requests.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {extractErrorMessage(requests.error)}
          </p>
        ) : requests.data.data.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {clientInvites.data?.data.length
                ? "Accept an invitation above to see the documents your accounting team needs from you."
                : "You’re all caught up. Any documents your accounting team asks you to provide will appear here."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.data.data.map((request) => (
              <PortalRequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export function ClientPortalHistoryPage() {
  const requests = useClientPortalRequests();

  const download = async (documentId: string) => {
    try {
      const result = await ClientPortalAPI.clientDownload(documentId);
      window.location.assign(result.data.url);
    } catch (error) {
      notifyError(error);
    }
  };

  return (
    <>
      <AuthThemeToggle />
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-4 py-10">
        <ClientPortalNavigation currentPage="history" />
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Atlas Node · Client portal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Shared documents &amp; history
          </h1>
          <p className="text-muted-foreground">
            See what your accounting team has asked for and review the files
            you have shared with them.
          </p>
        </div>

        {requests.isPending ? (
          <p className="text-sm text-muted-foreground">Loading your history…</p>
        ) : requests.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {extractErrorMessage(requests.error)}
          </p>
        ) : requests.data.data.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No document requests yet. When your accounting team asks you to
              share something, it will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.data.data.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>{request.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Requested by{" "}
                        {request.organizationName ?? "your accounting team"} ·{" "}
                        {new Date(request.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                      {request.status === "received"
                        ? "Documents shared"
                        : "Waiting for your upload"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {request.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No files have been shared for this request yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {request.documents.map((document) => (
                        <li
                          key={document.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {document.originalFilename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Shared on{" "}
                              {new Date(document.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void download(document.id)}
                          >
                            View file
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ClientPortalNavigation({
  currentPage,
}: {
  currentPage: "home" | "history";
}) {
  return (
    <nav
      aria-label="Client portal navigation"
      className="flex flex-wrap items-center gap-2 border-b pb-4"
    >
      <Button asChild variant="outline">
        <Link to="/">Atlas Node home</Link>
      </Button>
      <ClientDocumentRequestsBadge />
      <Button asChild variant={currentPage === "home" ? "default" : "outline"}>
        <Link
          to="/client-portal"
          aria-current={currentPage === "home" ? "page" : undefined}
        >
          Document requests
        </Link>
      </Button>
      <Button
        asChild
        variant={currentPage === "history" ? "default" : "outline"}
      >
        <Link
          to="/client-portal/history"
          aria-current={currentPage === "history" ? "page" : undefined}
        >
          Shared documents &amp; history
        </Link>
      </Button>
    </nav>
  );
}

function PortalRequestCard({ request }: { request: ClientDocumentRequest }) {
  const upload = useUploadClientDocument();
  const [file, setFile] = useState<File | null>(null);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const submitFile = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync({ requestId: request.id, file });
      setFile(null);
      toast.success("Document uploaded.");
    } catch (error) {
      notifyError(error);
    }
  };

  const download = async (documentId: string) => {
    try {
      const result = await ClientPortalAPI.clientDownload(documentId);
      window.location.assign(result.data.url);
    } catch (error) {
      notifyError(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{request.title}</CardTitle>
            <CardDescription className="mt-1">
              Requested by {request.organizationName ?? "your accounting team"}
              {request.dueDate ? ` · Due ${request.dueDate}` : ""}
            </CardDescription>
          </div>
          <span className="rounded-full border px-2.5 py-1 text-xs capitalize text-muted-foreground">
            {request.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {request.description ? (
          <p className="text-sm text-muted-foreground">{request.description}</p>
        ) : null}
        {request.documents.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">Uploaded files</p>
            <ul className="space-y-1">
              {request.documents.map((document) => (
                <li key={document.id}>
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => void download(document.id)}
                  >
                    {document.originalFilename}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.docx"
            onChange={selectFile}
            aria-label={`Choose a file for ${request.title}`}
            className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-2 file:text-sm"
          />
          <Button
            onClick={() => void submitFile()}
            disabled={!file || upload.isPending}
          >
            {upload.isPending ? "Uploading…" : "Upload file"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          PDF, image, CSV, XLSX, or DOCX · 10 MiB maximum per file.
        </p>
      </CardContent>
    </Card>
  );
}

export function ClientPortalInvitePage({ token }: { token?: string }) {
  const invitation = useClientInvitePreview(token);
  const session = useAuthSession();
  const accept = useAcceptClientInvite();
  const navigate = useNavigate();
  const redirect = token
    ? `/client-portal/invite?token=${encodeURIComponent(token)}`
    : "/client-portal";
  const user = session.data?.data?.user;
  const isSignedIn = !!session.data?.data?.session;
  const matchesEmail =
    user?.email?.toLowerCase() ===
    invitation.data?.data.invitedEmail.toLowerCase();

  const acceptInvitation = async () => {
    if (!token) return;
    try {
      await accept.mutateAsync(token);
      toast.success("Invitation accepted. Your document history is ready.");
      await navigate({ to: "/client-portal/history" });
    } catch (error) {
      notifyError(error);
    }
  };

  return (
    <>
      <AuthThemeToggle />
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-10">
        {invitation.isPending || session.isPending ? (
          <p className="text-sm text-muted-foreground">Loading invitation…</p>
        ) : invitation.isError || !invitation.data?.success ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Invitation unavailable</CardTitle>
              <CardDescription>
                This client portal invitation is invalid or has expired. Ask
                your accounting team to send a new one.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle>
                  Access {invitation.data.data.organizationName}&apos;s client
                  portal
                </CardTitle>
                <CardDescription>
                  {invitation.data.data.organizationName} invited{" "}
                  {invitation.data.data.clientName} (
                  {invitation.data.data.invitedEmail}) to exchange documents
                  securely.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                <p>
                  To accept, create an account or sign in with the invited
                  email, verify your address if prompted, then accept the
                  invitation.
                </p>
                <p className="mt-2">
                  Invitation expires{" "}
                  {new Date(
                    invitation.data.data.expiresAt,
                  ).toLocaleDateString()}
                  .
                </p>
              </CardContent>
            </Card>
            {!isSignedIn ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link
                    to="/sign-up"
                    search={{
                      redirect,
                      email: invitation.data.data.invitedEmail,
                    }}
                  >
                    Create account
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/sign-in" search={{ redirect }}>
                    Sign in
                  </Link>
                </Button>
              </div>
            ) : !user?.emailVerified ? (
              <Button asChild>
                <Link
                  to="/verify-email"
                  search={{ redirect, email: user?.email }}
                >
                  Verify your email to continue
                </Link>
              </Button>
            ) : !matchesEmail ? (
              <Card className="w-full">
                <CardContent className="py-5 text-sm text-muted-foreground">
                  This invitation was sent to{" "}
                  <strong>{invitation.data.data.invitedEmail}</strong>. Sign in
                  using that email address to continue.
                </CardContent>
              </Card>
            ) : (
              <Button
                onClick={() => void acceptInvitation()}
                disabled={accept.isPending}
              >
                {accept.isPending ? "Activating access…" : "Accept invitation"}
              </Button>
            )}
          </>
        )}
      </main>
    </>
  );
}
