import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { SELLER_BILLING_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: SELLER_BILLING_PLUGIN_OPTIONS, useFactory: () => SellerBillingPlugin.options }],
    configuration: config => {
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
        return config;
    },
    compatibility: '^3.0.0',
    dashboard: './dashboard/index.tsx',
})
export class SellerBillingPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<SellerBillingPlugin> {
        this.options = options;
        return SellerBillingPlugin;
    }
}
