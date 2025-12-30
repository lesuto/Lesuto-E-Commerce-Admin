import { Ctx, RequestContext } from '@vendure/core';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MarketplaceService } from '../services/marketplace.service';

@Resolver()
export class MarketplaceResolver {
    constructor(private marketplaceService: MarketplaceService) {}

    @Query()
    async marketplaceSuppliers(@Ctx() ctx: RequestContext) {
        const items = await this.marketplaceService.getMarketplaceSuppliers(ctx);
        return items;
    }

    @Mutation()
    async subscribeToSupplier(@Ctx() ctx: RequestContext, @Args('supplierChannelId') id: string) {
        return this.marketplaceService.subscribeToSupplier(ctx, id);
    }
   
    @Mutation()
    async addMarketplaceProduct(@Ctx() ctx: RequestContext, @Args('productId') id: string) {
        return this.marketplaceService.assignProductToChannel(ctx, id, ctx.channelId);
    }
}