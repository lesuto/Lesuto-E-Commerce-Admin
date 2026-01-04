import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { MERCHANT_INVENTORY_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { manageProductAssignmentsPermission } from './api/permissions'; // Import this
import { MerchantInventoryResolver, shopApiExtensions } from './api/api'; // Import this

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: MERCHANT_INVENTORY_PLUGIN_OPTIONS, useFactory: () => MerchantInventoryPlugin.options }
    ],
    adminApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [MerchantInventoryResolver],
    },
    configuration: config => {
        // Register the custom permission
        config.authOptions.customPermissions.push(manageProductAssignmentsPermission);
        return config;
    },
    compatibility: '^3.0.0',
    dashboard: './dashboard/index.tsx',
})
export class MerchantInventoryPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<MerchantInventoryPlugin> {
        this.options = options;
        return MerchantInventoryPlugin;
    }
}