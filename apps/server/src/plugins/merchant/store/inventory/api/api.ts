import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { 
    Allow, 
    Ctx, 
    RequestContext, 
    ID, 
    Transaction,
    Permission,
    TransactionalConnection,
    Product,
    ProductEvent,
    EventBus
} from '@vendure/core';
import gql from 'graphql-tag';

export const shopApiExtensions = gql`
    extend type Mutation {
        removeProductFromMyChannel(productId: ID!): Boolean!
    }
`;

@Resolver()
export class MerchantInventoryResolver {
    constructor(
        private connection: TransactionalConnection,
        private eventBus: EventBus
    ) {}

    @Transaction()
    @Mutation()
    // STRICT SECURITY: Only allow users with this specific permission
    @Allow('ManageProductAssignments' as Permission) 
    async removeProductFromMyChannel(
        @Ctx() ctx: RequestContext,
        @Args('productId') productId: ID,
    ): Promise<boolean> {
        
        // 1. Check if the product exists at all
        const product = await this.connection.getRepository(ctx, Product).findOne({
            where: { id: productId }
        });

        if (!product) throw new Error('Product not found');

        // 2. SAFE UNASSIGNMENT
        // This command removes the row from the 'product_channels' table ONLY.
        // It does NOT delete the product from the 'product' table.
        await this.connection
            .getRepository(ctx, Product)
            .createQueryBuilder()
            .relation(Product, 'channels')
            .of(product)
            .remove(ctx.channelId); // Removes ONLY the current channel's link

        // 3. Notify the system (Search Index, etc.) that this product changed
        // This ensures it disappears from your storefront immediately.
        this.eventBus.publish(new ProductEvent(ctx, product, 'updated'));

        return true;
    }
}