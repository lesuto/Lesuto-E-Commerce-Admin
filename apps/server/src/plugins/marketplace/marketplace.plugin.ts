import { PluginCommonModule, VendurePlugin, LanguageCode, Type } from '@vendure/core';
import { MarketplaceService } from './services/marketplace.service';
import { MarketplaceResolver } from './api/marketplace.resolver';
import { marketplaceSchema } from './api/marketplace.schema';
import { SupplierSubscription } from './entities/supplier-subscription.entity';
import { MarketplaceEventListener } from './services/marketplace.listener';

// 1. Define Options Interface
export interface MarketplacePluginOptions {
    // Add options here later if needed (e.g. license keys)
}

// 2. Define Injection Token
export const MARKETPLACE_PLUGIN_OPTIONS = Symbol('MARKETPLACE_PLUGIN_OPTIONS');

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [SupplierSubscription],
    providers: [
        // 3. Inject Options Pattern (Exactly like CMS)
        { 
            provide: MARKETPLACE_PLUGIN_OPTIONS, 
            useFactory: () => MarketplacePlugin.options 
        },
        MarketplaceService,
        MarketplaceEventListener
    ],
    adminApiExtensions: {
        schema: marketplaceSchema,
        resolvers: [MarketplaceResolver],
    },
    // 4. Dashboard Path (Updated to new folder)
    dashboard: './dashboard/index.tsx',
    configuration: config => {
        config.customFields.Channel.push(
            {
                name: 'isSupplier',
                type: 'boolean',
                public: true,
                defaultValue: false,
                label: [{ languageCode: LanguageCode.en, value: 'Is a Supplier?' }],
            },
            {
                name: 'commissionRate',
                type: 'float',
                public: true,
                defaultValue: 15.0,
                label: [{ languageCode: LanguageCode.en, value: 'Commission Rate (%)' }],
            },
            {
                name: 'logoUrl',
                type: 'string',
                public: true,
                label: [{ languageCode: LanguageCode.en, value: 'Brand Logo URL' }],
            },
            {
                name: 'supplierDescription',
                type: 'text',
                public: true,
                label: [{ languageCode: LanguageCode.en, value: 'Supplier Description' }],
                ui: { component: 'rich-text-form-input' },
            },
            {
                name: 'isMarketplaceApproved',
                type: 'boolean',
                public: true,
                defaultValue: false,
                label: [{ languageCode: LanguageCode.en, value: 'Approved for Marketplace' }],
            }
        );
        return config;
    },
})
export class MarketplacePlugin {
    // 5. Static Options Property
    static options: MarketplacePluginOptions;

    // 6. Static Init Method (Required for your CMS pattern)
    static init(options: MarketplacePluginOptions): Type<MarketplacePlugin> {
        this.options = options;
        return MarketplacePlugin;
    }
}