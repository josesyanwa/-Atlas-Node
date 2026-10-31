import type {
  ApiResponse,
  ClientDocumentRequest,
  ClientInvitePreview,
  ClientPortalInvite,
  ClientPortalDocumentDownload,
  ClientRecord,
  CreateClientRequest,
  CreateDocumentRequest,
} from "@atlas-node/api-interfaces";
import { axiosInstance } from "./axios-client";

export const ClientPortalAPI = {
  listClients: async (): Promise<ApiResponse<ClientRecord[]>> => {
    const response = await axiosInstance.get(
      "/api/organizations/current/clients",
    );
    return response.data as ApiResponse<ClientRecord[]>;
  },

  createClient: async (
    payload: CreateClientRequest,
  ): Promise<ApiResponse<ClientRecord>> => {
    const response = await axiosInstance.post(
      "/api/organizations/current/clients",
      payload,
    );
    return response.data as ApiResponse<ClientRecord>;
  },

  resendInvite: async (clientId: string): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post(
      `/api/organizations/current/clients/${clientId}/invite`,
    );
    return response.data as ApiResponse<null>;
  },

  listOrganizationRequests: async (
    clientId: string,
  ): Promise<ApiResponse<ClientDocumentRequest[]>> => {
    const response = await axiosInstance.get(
      `/api/organizations/current/clients/${clientId}/requests`,
    );
    return response.data as ApiResponse<ClientDocumentRequest[]>;
  },

  createDocumentRequest: async (
    clientId: string,
    payload: CreateDocumentRequest,
  ): Promise<ApiResponse<ClientDocumentRequest>> => {
    const response = await axiosInstance.post(
      `/api/organizations/current/clients/${clientId}/requests`,
      payload,
    );
    return response.data as ApiResponse<ClientDocumentRequest>;
  },

  firmDownload: async (
    documentId: string,
  ): Promise<ApiResponse<ClientPortalDocumentDownload>> => {
    const response = await axiosInstance.get(
      `/api/organizations/current/client-documents/${documentId}/download`,
    );
    return response.data as ApiResponse<ClientPortalDocumentDownload>;
  },

  previewInvite: async (
    token: string,
  ): Promise<ApiResponse<ClientInvitePreview>> => {
    const response = await axiosInstance.get(
      "/api/client-portal/invites/preview",
      { params: { token } },
    );
    return response.data as ApiResponse<ClientInvitePreview>;
  },

  acceptInvite: async (token: string): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post(
      "/api/client-portal/invites/accept",
      { token },
    );
    return response.data as ApiResponse<null>;
  },

  listMyInvites: async (): Promise<ApiResponse<ClientPortalInvite[]>> => {
    const response = await axiosInstance.get("/api/client-portal/invites/me");
    return response.data as ApiResponse<ClientPortalInvite[]>;
  },

  acceptInviteFromInbox: async (
    inviteId: string,
  ): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post(
      `/api/client-portal/invites/${inviteId}/accept`,
    );
    return response.data as ApiResponse<null>;
  },

  listPortalRequests: async (): Promise<
    ApiResponse<ClientDocumentRequest[]>
  > => {
    const response = await axiosInstance.get("/api/client-portal/requests");
    return response.data as ApiResponse<ClientDocumentRequest[]>;
  },

  uploadDocument: async (
    requestId: string,
    file: File,
  ): Promise<ApiResponse<ClientDocumentRequest["documents"][number]>> => {
    const response = await axiosInstance.put(
      `/api/client-portal/requests/${requestId}/files`,
      file,
      {
        params: { filename: file.name },
        headers: { "Content-Type": file.type },
      },
    );
    return response.data as ApiResponse<
      ClientDocumentRequest["documents"][number]
    >;
  },

  clientDownload: async (
    documentId: string,
  ): Promise<ApiResponse<ClientPortalDocumentDownload>> => {
    const response = await axiosInstance.get(
      `/api/client-portal/documents/${documentId}/download`,
    );
    return response.data as ApiResponse<ClientPortalDocumentDownload>;
  },
};
