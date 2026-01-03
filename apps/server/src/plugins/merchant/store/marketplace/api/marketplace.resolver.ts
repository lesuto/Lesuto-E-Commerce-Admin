import { Ctx, RequestContext, Allow, Channel } from '@vendure/core';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { MarketplaceService } from '../services/marketplace.service';

// We resolve fields on the standard 'Channel' entity
@Resolver('Channel')
export class MarketplaceResolver {
    constructor(private marketplaceService: MarketplaceService) {}

    @Query()
    @Allow(Permission.ReadChannel)
    async marketplaceSuppliers(@Ctx() ctx: RequestContext) {
        return this.marketplaceService.getMarketplaceSuppliers(ctx);
    }

    // The field name here 'supplierProfile' matches the schema above
    @ResolveField()
    async supplierProfile(@Parent() channel: Channel, @Ctx() ctx: RequestContext) {
        // This returns the Entity, which maps perfectly to our new GraphQL type
        // because the property names (nameCompany, commission, logo) are identical.
        return this.marketplaceService.getSupplierProfile(ctx, channel.id);
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