import { Body, Controller, Patch, Post } from '@nestjs/common';
import {
  UpdateSubscriptionPlanSchema,
  type UpdateSubscriptionPlanRequest,
  type ApiResponse,
  type EnterpriseExportResult,
  type Organization,
} from '@atlas-node/api-interfaces';
import {
  OrgMembership,
  type OrgMembershipContext,
} from '../decorators/org-membership.decorator';
import { RequireOrgRole } from '../decorators/require-org-role.decorator';
import { ZodValidationPipe } from '../dto/zod-validation.pipe';
import { OrganizationsService } from '../services/organizations.service';

@Controller('api/organizations/current')
export class OrganizationPlansController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Patch('subscription')
  @RequireOrgRole('owner')
  async updateSubscription(
    @OrgMembership() membership: OrgMembershipContext,
    @Body(new ZodValidationPipe(UpdateSubscriptionPlanSchema))
    body: UpdateSubscriptionPlanRequest,
  ): Promise<ApiResponse<Organization>> {
    const data = await this.organizations.updateSubscriptionPlan(
      membership.organizationId,
      body.activeSubscriptionPlan,
    );
    return { data, message: 'Subscription updated', success: true };
  }

  @Post('enterprise/export')
  @RequireOrgRole('admin')
  async startEnterpriseExport(
    @OrgMembership() membership: OrgMembershipContext,
  ): Promise<ApiResponse<EnterpriseExportResult>> {
    const message = await this.organizations.startEnterpriseExport(
      membership.organizationId,
    );
    return { data: { message }, message: 'Demo export queued', success: true };
  }
}
