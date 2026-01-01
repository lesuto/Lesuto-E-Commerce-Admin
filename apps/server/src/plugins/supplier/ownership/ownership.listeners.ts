import {
  EventBus,
  ProductEvent,
  ProductVariantEvent,
  TransactionalConnection,
  Product,
  ProductVariant
} from '@vendure/core';
import { Injectable, OnModuleInit } from '@nestjs/common';

// Safe type augmentation
declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomProductFields {
    ownercompany?: string;
  }
  interface CustomProductVariantFields {
    ownercompany?: string;
  }
}

@Injectable()
export class SupplierOwnershipListeners implements OnModuleInit {
  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection 
  ) {}

  onModuleInit() {
    // Handle Product Creation
    this.eventBus.ofType(ProductEvent).subscribe(async event => {
      if (event.type === 'created') {
        const products = Array.isArray(event.entity) ? event.entity : [event.entity];

        for (const product of products) {
          // Use .update to avoid re-triggering hooks/events unnecessarily
          await this.connection
            .getRepository(event.ctx, Product)
            .update(product.id, {
              customFields: {
                ownercompany: event.ctx.channel.code
              }
            });
        }
      }
    });

    // Handle Variant Creation
    this.eventBus.ofType(ProductVariantEvent).subscribe(async event => {
      if (event.type === 'created') {
        const variants = Array.isArray(event.entity) ? event.entity : [event.entity];

        for (const variant of variants) {
           await this.connection
            .getRepository(event.ctx, ProductVariant)
            .update(variant.id, {
              customFields: {
                ownercompany: event.ctx.channel.code
              }
            });
        }
      }
    });
  }
}