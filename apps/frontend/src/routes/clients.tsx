import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { ClientRecord } from "@atlas-node/api-interfaces";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrentOrganization } from "@/hooks/api/use-organizations";
import {
  useClientRequests,
  useClients,
  useCreateClient,
  useCreateDocumentRequest,
  useResendClientInvite,
} from "@/hooks/api/use-client-portal";
import { ClientPortalAPI } from "@/api/client-portal.api";
import { extractErrorMessage } from "@/lib/extract-error";

const notifyError = (error: unknown) => toast.error(extractErrorMessage(error));

export function ClientsPage() {
  const clientsQuery = useClients();
  const organization = useCurrentOrganization();
  const createClient = useCreateClient();
  const resendInvite = useResendClientInvite();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const role = organization.data?.data.role;
  const canManage = role === "owner" || role === "admin";

  const submitClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createClient.mutateAsync({
        name,
        email,
        ...(companyName.trim() ? { companyName } : {}),
      });
      setName("");
      setEmail("");
      setCompanyName("");
      toast.success("Client invited to the secure portal.");
    } catch (error) {
      notifyError(error);
    }
  };

  if (clientsQuery.isError) {
    return (
      <p className="py-6 text-sm text-destructive" role="alert">
        {extractErrorMessage(clientsQuery.error)}
      </p>
    );
  }

  const clients = clientsQuery.data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <PageHeader
        title="Clients"
        description="Invite clients, request documents, and track what has been received."
        eyebrow="Client portal"
      />

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a client</CardTitle>
            <CardDescription>
              We&apos;ll email them a secure invitation to create portal access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitClient} className="grid gap-3 sm:grid-cols-2">
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm"
                placeholder="Client contact name"
                aria-label="Client contact name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
              />
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm"
                type="email"
                placeholder="Client email"
                aria-label="Client email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"
                placeholder="Business name (optional)"
                aria-label="Business name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                maxLength={120}
              />
              <Button
                type="submit"
                className="sm:col-span-2 sm:justify-self-start"
                disabled={createClient.isPending}
              >
                {createClient.isPending
                  ? "Sending invitation…"
                  : "Add and invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {clientsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No clients yet. Add a client to start a document collection.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              canManage={canManage}
              onResend={() =>
                resendInvite.mutate(client.id, {
                  onSuccess: () => toast.success("Invitation resent."),
                  onError: notifyError,
                })
              }
              isResending={resendInvite.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({
  client,
  canManage,
  onResend,
  isResending,
}: {
  client: ClientRecord;
  canManage: boolean;
  onResend: () => void;
  isResending: boolean;
}) {
  const requests = useClientRequests(client.id);
  const createRequest = useCreateDocumentRequest(client.id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createRequest.mutateAsync({
        title,
        ...(description.trim() ? { description } : {}),
        ...(dueDate ? { dueDate } : {}),
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      toast.success("Document request added.");
    } catch (error) {
      notifyError(error);
    }
  };

  const download = async (documentId: string) => {
    try {
      const result = await ClientPortalAPI.firmDownload(documentId);
      window.location.assign(result.data.url);
    } catch (error) {
      notifyError(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{client.name}</CardTitle>
            <CardDescription className="mt-1">
              {client.companyName ? `${client.companyName} · ` : ""}
              {client.email}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border px-2.5 py-1 text-xs capitalize text-muted-foreground">
              {client.portalStatus === "active"
                ? "Portal active"
                : "Invitation pending"}
            </span>
            {canManage && client.portalStatus === "invited" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onResend}
                disabled={isResending}
              >
                Resend invite
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {canManage ? (
          <form
            onSubmit={submitRequest}
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
          >
            <p className="text-sm font-medium sm:col-span-2">
              Request a document
            </p>
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm"
              placeholder="What do you need?"
              aria-label={`Document request title for ${client.name}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              required
            />
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm"
              type="date"
              aria-label={`Due date for ${client.name}`}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"
              placeholder="Instructions (optional)"
              aria-label={`Instructions for ${client.name}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
            <Button
              type="submit"
              size="sm"
              className="sm:col-span-2 sm:justify-self-start"
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? "Saving…" : "Send document request"}
            </Button>
          </form>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Document requests</h3>
          {requests.isPending ? (
            <p className="text-sm text-muted-foreground">Loading requests…</p>
          ) : requests.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {extractErrorMessage(requests.error)}
            </p>
          ) : (requests.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents requested yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {requests.data?.data.map((request) => (
                <li key={request.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{request.title}</p>
                      {request.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border px-2 py-1 text-xs capitalize text-muted-foreground">
                      {request.status}
                    </span>
                  </div>
                  {request.dueDate ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Due {request.dueDate}
                    </p>
                  ) : null}
                  {request.documents.length > 0 ? (
                    <ul className="mt-3 space-y-1">
                      {request.documents.map((document) => (
                        <li key={document.id}>
                          <Button
                            variant="link"
                            className="h-auto p-0 text-sm"
                            onClick={() => void download(document.id)}
                          >
                            Download {document.originalFilename}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
