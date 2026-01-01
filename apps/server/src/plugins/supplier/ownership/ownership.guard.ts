import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext, GqlContextType } from '@nestjs/graphql';
import { 
  ForbiddenError, 
  Product, 
  ProductVariant, 
  TransactionalConnection, 
  RequestContext 
} from '@vendure/core';
import { DEFAULT_CHANNEL_CODE } from '@vendure/common/lib/shared-constants';

@Injectable()
export class SupplierOwnershipGuard implements CanActivate {
  constructor(private connection: TransactionalConnection) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. CRITICAL FIX: Skip if this is not a GraphQL request
    // (This prevents the crash on Job Queues and Workers)
    if (context.getType<GqlContextType>() !== 'graphql') {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const { req, info, args } = ctx.getContext();

    // 2. Safety check: if for some reason info is missing, allow it
    if (!info || !req?.ctx) {
      return true;
    }

    const vendureCtx: RequestContext = req.ctx;

    // 3. List of operations to protect
    const restrictedOperations = [
      'updateProduct', 
      'deleteProduct', 
      'updateProductVariants', 
      'deleteProductVariant'
    ];

    if (!restrictedOperations.includes(info.fieldName)) {
      return true;
    }

    // 4. Allow Super Admin (Default Channel) to bypass checks
    if (vendureCtx.channel.code === DEFAULT_CHANNEL_CODE) {
      return true;
    }

    // 5. Resolve the ID(s) needed to check ownership
    let entityIds: string[] = [];

    if (args.id) {
      entityIds.push(args.id);
    } else if (args.input) {
      if (Array.isArray(args.input)) {
        entityIds = args.input.map((i: any) => i.id);
      } else {
        entityIds.push(args.input.id);
      }
    }

    if (entityIds.length === 0) return true;

    // 6. Check ownership for the resolved IDs
    if (info.fieldName.includes('ProductVariant')) {
      const variants = await this.connection
        .getRepository(vendureCtx, ProductVariant)
        .findByIds(entityIds);

      for (const variant of variants) {
        this.checkOwner(variant.customFields?.ownercompany, vendureCtx.channel.code);
      }
    } else {
      const products = await this.connection
        .getRepository(vendureCtx, Product)
        .findByIds(entityIds);

      for (const product of products) {
        this.checkOwner(product.customFields?.ownercompany, vendureCtx.channel.code);
      }
    }

    return true;
  }

  private checkOwner(owner: string | undefined, currentChannel: string) {
    if (owner && owner !== currentChannel) {
      throw new ForbiddenError();
    }
  }
}