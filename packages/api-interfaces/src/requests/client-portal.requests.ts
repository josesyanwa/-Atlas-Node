import { z } from "zod";

export const CreateClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email(),
  companyName: z.string().trim().max(120).optional(),
});
export type CreateClientRequest = z.infer<typeof CreateClientSchema>;

export const CreateDocumentRequestSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().trim().max(2000).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be a calendar date")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, "Due date must be a real calendar date")
    .optional(),
});
export type CreateDocumentRequest = z.infer<typeof CreateDocumentRequestSchema>;

export const ClientInviteTokenSchema = z.object({
  token: z.string().min(32).max(256),
});
export type ClientInviteToken = z.infer<typeof ClientInviteTokenSchema>;
