import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { MERCHANT_INVENTORY_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { manageProductAssignmentsPermission } from './api/permissions';

// --- NEW IMPORTS ---
import { MerchantInventoryService } from './services/inventory.service';
import { MerchantInventoryResolver } from './api/inventory.resolver';
import { merchantInventoryApi } from './api/inventory.api';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: MERCHANT_INVENTORY_PLUGIN_OPTIONS, useFactory: () => MerchantInventoryPlugin.options },
        // IMPORTANT: Register the service here so it can be injected
        MerchantInventoryService, 
    ],
    adminApiExtensions: {
        // Use the new schema that defines 'myInventory'
        schema: merchantInventoryApi, 
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