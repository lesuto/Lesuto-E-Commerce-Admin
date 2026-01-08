import { Ctx, RequestContext, Allow, Channel } from '@vendure/core';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { MarketplaceService } from '../services/marketplace.service';
import { ProductListOptions } from '@vendure/common/lib/generated-types';

@Resolver('Channel')
export class MarketplaceResolver {
    constructor(private marketplaceService: MarketplaceService) { }

    @Query()
    @Allow(Permission.ReadChannel)
    async marketplaceSuppliers(@Ctx() ctx: RequestContext) {
        return this.marketplaceService.getMarketplaceSuppliers(ctx);
    }

    @Query()
    @Allow(Permission.ReadChannel)
    async supplier(@Ctx() ctx: RequestContext, @Args('supplierChannelId') id: string) {
        return this.marketplaceService.getSupplierChannel(ctx, id);
    }

    // --- UPDATED RESOLVER ---
    @Query()
    @Allow(Permission.ReadChannel)
    async supplierProducts(
        @Ctx() ctx: RequestContext, 
        @Args('supplierChannelId') id: string,
        @Args('options') options?: ProductListOptions,
        @Args('collectionId') collectionId?: string, // <--- Accept the ID
        @Args('term') term?: string
    ) {
        // Pass to service
        return this.marketplaceService.getSupplierProducts(ctx, id, options, collectionId, term);
    }

    @ResolveField()
    async supplierProfile(@Parent() channel: Channel, @Ctx() ctx: RequestContext) {
        return this.marketplaceService.getSupplierProfile(ctx, channel.id);
    }

    @Mutation()
    @Allow(Permission.UpdateChannel)
    async subscribeToSupplier(@Ctx() ctx: RequestContext, @Args('supplierChannelId') id: string) {
        return this.marketplaceService.subscribeToSupplier(ctx, id);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async addMarketplaceProduct(@Ctx() ctx: RequestContext, @Args('productId') id: string) {
        return this.marketplaceService.assignProductToChannel(ctx, id, ctx.channelId);
    }

    @Mutation()
    @Allow(Permission.UpdateProduct)
    async removeMarketplaceProduct(@Ctx() ctx: RequestContext, @Args('productId') id: string) {
        return this.marketplaceService.removeProductFromChannel(ctx, id, ctx.channelId);
    }
}