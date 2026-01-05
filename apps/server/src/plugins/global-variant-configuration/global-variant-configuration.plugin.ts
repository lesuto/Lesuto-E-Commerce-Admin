import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { GLOBAL_VARIANT_CONFIGURATION_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { GlobalVariantConfigurationService } from './services/global-variant-configuration.service';
import { adminApiExtensions } from './api/api';
import { GlobalVariantConfigurationResolver } from './api/resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { 
            provide: GLOBAL_VARIANT_CONFIGURATION_PLUGIN_OPTIONS, 
            useFactory: () => GlobalVariantConfigurationPlugin.options 
        }, 
        GlobalVariantConfigurationService,
        GlobalVariantConfigurationResolver
    ],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [GlobalVariantConfigurationResolver]
    },
    configuration: config => {
        return config;
    },
    compatibility: '^3.0.0',
    // 👇 THIS IS THE KEY FIX FOR VISIBILITY
    dashboard: './dashboard/index.tsx', 
})
export class GlobalVariantConfigurationPlugin {
    static options: PluginInitOptions = {};

    static init(options: PluginInitOptions): Type<GlobalVariantConfigurationPlugin> {
        this.options = options;
        return GlobalVariantConfigurationPlugin;
    }
}