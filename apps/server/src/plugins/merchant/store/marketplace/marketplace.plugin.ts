import { PluginCommonModule, VendurePlugin, LanguageCode, Type } from '@vendure/core';
import { MarketplaceService } from './services/marketplace.service';
import { MarketplaceResolver } from './api/marketplace.resolver';
import { marketplaceSchema } from './api/marketplace.schema';
import { SupplierSubscription } from './entities/supplier-subscription.entity';
import { MarketplaceProfileView } from './entities/marketplace-profile-view.entity'; // Import the view
import { MarketplaceEventListener } from './services/marketplace.listener';

export interface MarketplacePluginOptions {}
export const MARKETPLACE_PLUGIN_OPTIONS = Symbol('MARKETPLACE_PLUGIN_OPTIONS');

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [SupplierSubscription, MarketplaceProfileView], // Register the view
    providers: [
        { 
            provide: MARKETPLACE_PLUGIN_OPTIONS, 
            useFactory: () => MerchantMarketplacePlugin.options 
        },
        MarketplaceService,
        MarketplaceEventListener
    ],
    adminApiExtensions: {
        schema: marketplaceSchema,
        resolvers: [MarketplaceResolver],
    },
    dashboard: './dashboard/index.tsx',
})
export class MerchantMarketplacePlugin {
    static options: MarketplacePluginOptions;
    static init(options: MarketplacePluginOptions): Type<MerchantMarketplacePlugin> {
        this.options = options;
        return MerchantMarketplacePlugin;
    }
}