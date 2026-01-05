import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { GLOBAL_VARIANT_CONFIGURATION_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { GlobalVariantConfigurationService } from './services/global-variant-configuration.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { 
            provide: GLOBAL_VARIANT_CONFIGURATION_PLUGIN_OPTIONS, 
            useFactory: () => GlobalVariantConfigurationPlugin.options 
        }, 
        GlobalVariantConfigurationService
    ],
    configuration: config => {
        return config;
    },
    compatibility: '^3.0.0',
})
export class GlobalVariantConfigurationPlugin {
    static options: PluginInitOptions = {};

    static init(options: PluginInitOptions): Type<GlobalVariantConfigurationPlugin> {
        this.options = options;
        return GlobalVariantConfigurationPlugin;
    }
}