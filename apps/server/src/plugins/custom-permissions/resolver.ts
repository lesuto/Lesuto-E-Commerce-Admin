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
  // ✅ FIX: Use .Permission here. The class instance does not have a .name property.
  @Allow(manageProductAssignmentsPermission.Permission)
  async assignProductToMyChannel(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: ID,
  ): Promise<boolean> {
    console.log('Attempting assignment...');
    console.log('User ID:', ctx.activeUserId);
    console.log('Target Channel ID:', ctx.channelId);

    const product = await this.productService.findOne(ctx, productId);
    if (!product) throw new Error('Product not found');

    await this.productService.assignProductsToChannel(ctx, {
      productIds: [product.id],
      channelId: ctx.channelId,
    });

    return true;
  }

  @Transaction()
  @Mutation()
  // ✅ FIX: Use .Permission here
  @Allow(manageProductAssignmentsPermission.Permission)
  async removeProductFromMyChannel(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: ID,
  ): Promise<boolean> {
    const product = await this.productService.findOne(ctx, productId);
    if (!product) throw new Error('Product not found');

    await this.productService.removeProductsFromChannel(ctx, {
      productIds: [product.id],
      channelId: ctx.channelId,
    });

    return true;
  }
}