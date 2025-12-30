import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { CMS_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { Article } from './entities/article.entity';
import { ArticleService } from './services/article.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: CMS_PLUGIN_OPTIONS, useFactory: () => CmsPlugin.options }, ArticleService],
    configuration: config => {
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
        return config;
    },
    compatibility: '^3.0.0',
    entities: [Article],
    dashboard: './dashboard/index.tsx',
})
export class CmsPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<CmsPlugin> {
        this.options = options;
        return CmsPlugin;
    }
}
