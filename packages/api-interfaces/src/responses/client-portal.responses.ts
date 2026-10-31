import type {
  ClientInviteStatus,
  DocumentRequestStatus,
} from "./organization.responses";

export interface ClientRecord {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  companyName: string | null;
  portalStatus: "invited" | "active";
  createdAt: string;
}

export interface ClientInvitePreview {
  organizationName: string;
  clientName: string;
  invitedEmail: string;
  expiresAt: string;
  status: ClientInviteStatus;
}

export interface ClientPortalInvite {
  id: string;
  organizationName: string;
  clientName: string;
  invitedEmail: string;
  expiresAt: string;
}

export interface ClientDocument {
  id: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ClientDocumentRequest {
  id: string;
  clientId: string;
  clientName?: string;
  organizationName?: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: DocumentRequestStatus;
  createdAt: string;
  documents: ClientDocument[];
}

export interface ClientPortalDocumentDownload {
  url: string;
  expiresAt: string;
}
