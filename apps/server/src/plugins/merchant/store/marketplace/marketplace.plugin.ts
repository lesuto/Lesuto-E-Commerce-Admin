import { PluginCommonModule, VendurePlugin, Type } from '@vendure/core';
import { MarketplaceService } from './services/marketplace.service';
import { MarketplaceResolver } from './api/marketplace.resolver';
import { marketplaceSchema } from './api/marketplace.schema';
import { SupplierSubscription } from './entities/supplier-subscription.entity';
import { MarketplaceProfileView } from './entities/marketplace-profile-view.entity';
import { MarketplaceEventListener } from './services/marketplace.listener';

export interface MarketplacePluginOptions {}
export const MARKETPLACE_PLUGIN_OPTIONS = Symbol('MARKETPLACE_PLUGIN_OPTIONS');

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [SupplierSubscription, MarketplaceProfileView],
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
    // If you need to define the permission strictly in code, you would add configuration here
    // configuration: config => {
    //    config.authOptions.customPermissions.push({
    //        name: 'ManageProductAssignments',
    //        description: 'Allow adding/removing products from suppliers'
    //    });
    //    return config;
    // },
    dashboard: './dashboard/index.tsx',
})
export class MerchantMarketplacePlugin {
    static options: MarketplacePluginOptions;
    static init(options: MarketplacePluginOptions): Type<MerchantMarketplacePlugin> {
        this.options = options;
        return MerchantMarketplacePlugin;
    }
}