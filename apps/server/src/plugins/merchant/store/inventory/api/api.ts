import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { 
    Allow, 
    Ctx, 
    RequestContext, 
    ID, 
    ProductService, 
    Transaction 
} from '@vendure/core';
import { manageProductAssignmentsPermission } from './permissions';
import gql from 'graphql-tag';

// Define the Schema Extension
export const shopApiExtensions = gql`
    extend type Mutation {
        removeProductFromMyChannel(productId: ID!): Boolean!
    }
`;

@Resolver()
export class MerchantInventoryResolver {
    constructor(private productService: ProductService) {}

    @Transaction()
    @Mutation()
    @Allow(manageProductAssignmentsPermission.Permission)
    async removeProductFromMyChannel(
        @Ctx() ctx: RequestContext, // @Ctx() is the decorator, RequestContext is the type
        @Args('productId') productId: ID,
    ): Promise<boolean> {
        const product = await this.productService.findOne(ctx, productId);
        if (!product) throw new Error('Product not found');

        // Remove from current channel
        await this.productService.removeProductsFromChannel(ctx, {
            productIds: [product.id],
            channelId: ctx.channelId,
        });

        return true;
    }
}