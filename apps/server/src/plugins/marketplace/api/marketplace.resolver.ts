import { Ctx, RequestContext, Allow } from '@vendure/core';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types'; // For Permission enums
import { MarketplaceService } from '../services/marketplace.service';

@Resolver()
export class MarketplaceResolver {
    constructor(private marketplaceService: MarketplaceService) {}

    @Query()
    @Allow(Permission.ReadChannel)
    async marketplaceSuppliers(@Ctx() ctx: RequestContext) {
        const items = await this.marketplaceService.getMarketplaceSuppliers(ctx);
        return items;
    }

    @Mutation()
    @Allow(Permission.UpdateChannel)
    async subscribeToSupplier(@Ctx() ctx: RequestContext, @Args('supplierChannelId') id: string) {
        return this.marketplaceService.subscribeToSupplier(ctx, id);
    }
   
    @Mutation()
    @Allow(Permission.UpdateProduct)
    async addMarketplaceProduct(@Ctx() ctx: RequestContext, @Args('productId') id: string) {
        return this.marketplaceService.assignProductToChannel(ctx, id, ctx.channelId);
    }
}