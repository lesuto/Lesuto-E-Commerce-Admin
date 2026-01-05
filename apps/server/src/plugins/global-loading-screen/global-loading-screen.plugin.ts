import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { GLOBAL_LOADING_SCREEN_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: GLOBAL_LOADING_SCREEN_PLUGIN_OPTIONS, useFactory: () => GlobalLoadingScreenPlugin.options }],
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
export class GlobalLoadingScreenPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<GlobalLoadingScreenPlugin> {
        this.options = options;
        return GlobalLoadingScreenPlugin;
    }
}
