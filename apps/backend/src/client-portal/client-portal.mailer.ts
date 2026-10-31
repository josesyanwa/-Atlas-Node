import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

@Injectable()
export class ClientPortalMailer {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = this.config.getOrThrow<string>('EMAIL_FROM');
  }

  async sendInvite(input: {
    to: string;
    clientName: string;
    organizationName: string;
    inviteUrl: string;
  }): Promise<void> {
    const clientName = escapeHtml(input.clientName);
    const organizationName = escapeHtml(input.organizationName);
    const inviteUrl = escapeHtml(input.inviteUrl);
    const subjectOrganizationName = input.organizationName.replace(
      /[\r\n]/g,
      ' ',
    );
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: input.to,
      subject: `${subjectOrganizationName} invited you to its client portal`,
      html: `<p>Hello ${clientName},</p><p>${organizationName} invited you to its secure client portal to exchange requested documents.</p><ol><li>Open the invitation link.</li><li>Create an account or sign in using this email address.</li><li>Verify your email if prompted, then select <strong>Accept invitation</strong>.</li></ol><p><a href="${inviteUrl}">Review and accept your invitation</a></p><p>This invitation expires in 7 days.</p>`,
      text: `Hello ${input.clientName},\n\n${input.organizationName} invited you to its secure client portal to exchange requested documents.\n\nTo accept:\n1. Open the invitation link.\n2. Create an account or sign in using this email address.\n3. Verify your email if prompted, then select “Accept invitation”.\n\nReview and accept your invitation: ${input.inviteUrl}\n\nThis invitation expires in 7 days.`,
    });
    if (error) {
      throw new Error(
        `Failed to send client portal invitation: ${error.message}`,
      );
    }
  }
}
