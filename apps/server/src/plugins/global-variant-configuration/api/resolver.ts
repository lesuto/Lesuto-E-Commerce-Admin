import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, RequestContext } from '@vendure/core';
import { GlobalVariantConfigurationService } from '../services/global-variant-configuration.service';

@Resolver()
export class GlobalVariantConfigurationResolver {
    constructor(private globalVariantService: GlobalVariantConfigurationService) {}

    @Mutation()
    @Allow(Permission.SuperAdmin)
    async syncGlobalVariants(
        @Ctx() ctx: RequestContext,
        @Args('sourceChannelId') sourceChannelId?: ID,
    ) {
        return this.globalVariantService.performManualSync(ctx, sourceChannelId);
    }
}