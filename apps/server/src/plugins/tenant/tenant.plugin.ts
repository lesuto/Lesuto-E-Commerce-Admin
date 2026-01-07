import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { TENANT_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { tenantApiExtensions } from './api/api-extensions';
import { TenantResolver } from './api/tenant.resolver';
import { TenantService } from './services/tenant.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    shopApiExtensions: {
        schema: tenantApiExtensions,
        resolvers: [TenantResolver],
    },
    providers: [
        { provide: TENANT_PLUGIN_OPTIONS, useFactory: () => TenantPlugin.options },
        TenantService,
    ],
    configuration: config => {
        return config;
    },
    compatibility: '^3.0.0',
})
export class TenantPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<TenantPlugin> {
        this.options = options;
        return TenantPlugin;
    }
}