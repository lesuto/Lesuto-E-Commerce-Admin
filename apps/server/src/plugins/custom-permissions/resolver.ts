import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { 
    Ctx, 
    ProductService, 
    RequestContext, 
    Allow, 
    Transaction,
    ID
} from '@vendure/core';
import { manageProductAssignmentsPermission } from './constants';

@Resolver()
export class ProductChannelResolver {
  constructor(private productService: ProductService) {}

  @Transaction()
  @Mutation()
  @Allow(manageProductAssignmentsPermission.Permission)
  async assignProductToMyChannel(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: ID,
  ): Promise<boolean> {
    console.log('Attempting assignment...');
    console.log('User ID:', ctx.activeUserId);
    console.log('Target Channel ID:', ctx.channelId); 
    console.log('Product ID:', productId);

    const currentChannelId = ctx.channelId;

    const product = await this.productService.findOne(ctx, productId);
    if (!product) throw new Error('Product not found');

    await this.productService.assignProductsToChannel(ctx, {
      productIds: [product.id],
      channelId: currentChannelId,
    });

    return true;
  }

  @Transaction()
  @Mutation()
  @Allow(manageProductAssignmentsPermission.Permission)
  async removeProductFromMyChannel(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: ID,
  ): Promise<boolean> {
    const currentChannelId = ctx.channelId;

    const product = await this.productService.findOne(ctx, productId);
    if (!product) throw new Error('Product not found');

    await this.productService.removeProductsFromChannel(ctx, {
      productIds: [product.id],
      channelId: currentChannelId,
    });

    return true;
  }
}