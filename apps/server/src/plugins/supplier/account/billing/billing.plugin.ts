import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { SUPPLIER_BILLING_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: SUPPLIER_BILLING_PLUGIN_OPTIONS, useFactory: () => SupplierBillingPlugin.options }],
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
export class SupplierBillingPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<SupplierBillingPlugin> {
        this.options = options;
        return SupplierBillingPlugin;
    }
}
