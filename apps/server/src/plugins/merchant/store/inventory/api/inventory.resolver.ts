import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { 
    Allow, 
    Ctx, 
    RequestContext, 
    Permission
} from '@vendure/core';
import { ProductListOptions } from '@vendure/common/lib/generated-types';
import { MerchantInventoryService } from '../services/inventory.service';

@Resolver()
export class MerchantInventoryResolver {
    constructor(
        private inventoryService: MerchantInventoryService
    ) {}

    @Query()
    @Allow(Permission.Authenticated) 
    async myInventory(
        @Ctx() ctx: RequestContext, 
        @Args('options') options?: ProductListOptions,
        @Args('collectionId') collectionId?: string,
        @Args('facetValueIds') facetValueIds?: string[],
        @Args('supplierCodes') supplierCodes?: string[],
        @Args('term') term?: string,
        @Args('stock') stock?: string
    ) {
        return this.inventoryService.getMyInventory(
            ctx, options, collectionId, facetValueIds, supplierCodes, term, stock
        );
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async removeProductFromInventory(
        @Ctx() ctx: RequestContext, 
        @Args('productId') productId: string
    ) {
        return this.inventoryService.removeProductFromInventory(ctx, productId);
    }
}