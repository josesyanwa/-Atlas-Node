import type {
  ApiResponse,
  CreateOrganizationRequest,
  EnterpriseExportResult,
  MyOrganization,
  Organization,
  OrganizationRole,
  UpdateSubscriptionPlanRequest,
  TransferOwnershipRequest,
  UpdateOrganizationRequest,
} from "@atlas-node/api-interfaces";
import { axiosInstance } from "./axios-client";

export const OrganizationsAPI = {
  create: async (
    payload: CreateOrganizationRequest,
  ): Promise<ApiResponse<Organization>> => {
    const response = await axiosInstance.request({
      url: "/api/organizations",
      method: "POST",
      data: payload,
    });
    return response.data as ApiResponse<Organization>;
  },

  listMine: async (): Promise<ApiResponse<MyOrganization[]>> => {
    const response = await axiosInstance.request({
      url: "/api/organizations/me",
      method: "GET",
    });
    return response.data as ApiResponse<MyOrganization[]>;
  },

  getCurrent: async (): Promise<
    ApiResponse<{ organization: Organization; role: OrganizationRole }>
  > => {
    const response = await axiosInstance.request({
      url: "/api/organizations/current",
      method: "GET",
    });
    return response.data as ApiResponse<{
      organization: Organization;
      role: OrganizationRole;
    }>;
  },

  updateCurrent: async (
    payload: UpdateOrganizationRequest,
  ): Promise<ApiResponse<Organization>> => {
    const response = await axiosInstance.request({
      url: "/api/organizations/current",
      method: "PATCH",
      data: payload,
    });
    return response.data as ApiResponse<Organization>;
  },

  deleteCurrent: async (): Promise<void> => {
    await axiosInstance.request({
      url: "/api/organizations/current",
      method: "DELETE",
    });
  },

  transferOwnership: async (
    payload: TransferOwnershipRequest,
  ): Promise<ApiResponse<Organization>> => {
    const response = await axiosInstance.request({
      url: "/api/organizations/current/transfer-ownership",
      method: "POST",
      data: payload,
    });
    return response.data as ApiResponse<Organization>;
  },

  updateSubscription: async (
    payload: UpdateSubscriptionPlanRequest,
  ): Promise<ApiResponse<Organization>> => {
    const response = await axiosInstance.request({
      url: "/api/organizations/current/subscription",
      method: "PATCH",
      data: payload,
    });
    return response.data as ApiResponse<Organization>;
  },

  startEnterpriseExport: async (): Promise<
    ApiResponse<EnterpriseExportResult>
  > => {
    const response = await axiosInstance.request({
      url: "/api/organizations/current/enterprise/export",
      method: "POST",
    });
    return response.data as ApiResponse<EnterpriseExportResult>;
  },
};
