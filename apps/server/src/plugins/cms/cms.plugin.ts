import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { CMS_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { Page } from './entities/page.entity';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { CmsAdminResolver } from './api/cms-admin.resolver';
import { CmsShopResolver } from './api/cms-shop.resolver';
import { CMSService } from './services/cms.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: CMS_PLUGIN_OPTIONS, useFactory: () => CmsPlugin.options },
        CMSService
    ],
    entities: [Page],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [CmsAdminResolver]
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [CmsShopResolver]
    },
    dashboard: './dashboard/index.tsx', // Keeping your dashboard entry point
    compatibility: '^3.0.0',
})
export class CmsPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<CmsPlugin> {
        this.options = options;
        return CmsPlugin;
    }
}