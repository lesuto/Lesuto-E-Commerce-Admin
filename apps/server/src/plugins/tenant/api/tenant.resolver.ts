import { Args, Query, Resolver } from '@nestjs/graphql';
import { RequestContext, Ctx } from '@vendure/core';
import { TenantService } from '../services/tenant.service';

@Resolver()
export class TenantResolver {
    constructor(private tenantService: TenantService) {}

    // Public query - no permission guard needed as this is public info
    @Query()
    async getChannelToken(
        @Ctx() ctx: RequestContext,
        @Args('channelCode') channelCode: string
    ): Promise<string | null> {
        return this.tenantService.getChannelTokenByCode(ctx, channelCode);
    }
}