import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { GLOBAL_FACET_CONFIGURATION_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { GlobalFacetService } from './services/global-facet.service'; // Updated path

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { 
            provide: GLOBAL_FACET_CONFIGURATION_PLUGIN_OPTIONS, 
            useFactory: () => GlobalFacetConfigurationPlugin.options 
        },
        GlobalFacetService, 
    ],
    configuration: config => {
        return config;
    },
    compatibility: '^3.0.0',
    dashboard: './dashboard/index.tsx', // Points to the clean index
})
export class GlobalFacetConfigurationPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<GlobalFacetConfigurationPlugin> {
        this.options = options;
        return GlobalFacetConfigurationPlugin;
    }
}