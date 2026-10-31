import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateClientRequest,
  CreateDocumentRequest,
} from "@atlas-node/api-interfaces";
import { ClientPortalAPI } from "@/api/client-portal.api";
import { useActiveOrganizationStore } from "@/stores/active-organization-store";

export const clientPortalKeys = {
  clients: (organizationId: string | null) =>
    ["client-portal", "clients", organizationId] as const,
  firmRequests: (organizationId: string | null, clientId: string) =>
    ["client-portal", "firm-requests", organizationId, clientId] as const,
  portalRequests: ["client-portal", "portal-requests"] as const,
  myInvites: (userId?: string) =>
    ["client-portal", "invites", "me", userId] as const,
  invite: (token: string | undefined) =>
    ["client-portal", "invite", token] as const,
};

export function useClients() {
  const organizationId = useActiveOrganizationStore(
    (state) => state.activeOrganizationId,
  );
  return useQuery({
    queryKey: clientPortalKeys.clients(organizationId),
    queryFn: () => ClientPortalAPI.listClients(),
    enabled: !!organizationId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const organizationId = useActiveOrganizationStore(
    (state) => state.activeOrganizationId,
  );
  return useMutation({
    mutationFn: (payload: CreateClientRequest) =>
      ClientPortalAPI.createClient(payload),
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: clientPortalKeys.clients(organizationId),
      });
    },
  });
}

export function useResendClientInvite() {
  const queryClient = useQueryClient();
  const organizationId = useActiveOrganizationStore(
    (state) => state.activeOrganizationId,
  );
  return useMutation({
    mutationFn: (clientId: string) => ClientPortalAPI.resendInvite(clientId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: clientPortalKeys.clients(organizationId),
      });
    },
  });
}

export function useClientRequests(clientId: string) {
  const organizationId = useActiveOrganizationStore(
    (state) => state.activeOrganizationId,
  );
  return useQuery({
    queryKey: clientPortalKeys.firmRequests(organizationId, clientId),
    queryFn: () => ClientPortalAPI.listOrganizationRequests(clientId),
    enabled: !!organizationId && !!clientId,
  });
}

export function useCreateDocumentRequest(clientId: string) {
  const queryClient = useQueryClient();
  const organizationId = useActiveOrganizationStore(
    (state) => state.activeOrganizationId,
  );
  return useMutation({
    mutationFn: (payload: CreateDocumentRequest) =>
      ClientPortalAPI.createDocumentRequest(clientId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: clientPortalKeys.firmRequests(organizationId, clientId),
      });
    },
  });
}

export function useClientInvitePreview(token?: string) {
  return useQuery({
    queryKey: clientPortalKeys.invite(token),
    queryFn: () => ClientPortalAPI.previewInvite(token!),
    enabled: !!token,
  });
}

export function useAcceptClientInvite() {
  return useMutation({
    mutationFn: (token: string) => ClientPortalAPI.acceptInvite(token),
  });
}

export function useMyClientPortalInvites(userId?: string) {
  return useQuery({
    queryKey: clientPortalKeys.myInvites(userId),
    queryFn: () => ClientPortalAPI.listMyInvites(),
    enabled: !!userId,
  });
}

export function useAcceptClientPortalInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      ClientPortalAPI.acceptInviteFromInbox(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["client-portal", "invites", "me"],
      });
      await queryClient.invalidateQueries({
        queryKey: clientPortalKeys.portalRequests,
      });
      await queryClient.invalidateQueries({
        queryKey: ["organizations", "me"],
      });
    },
  });
}

export function useClientPortalRequests() {
  return useQuery({
    queryKey: clientPortalKeys.portalRequests,
    queryFn: () => ClientPortalAPI.listPortalRequests(),
  });
}

export function useUploadClientDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; file: File }) =>
      ClientPortalAPI.uploadDocument(input.requestId, input.file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: clientPortalKeys.portalRequests,
      });
    },
  });
}
