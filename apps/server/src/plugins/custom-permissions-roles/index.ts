import { VendurePlugin, PluginCommonModule } from '@vendure/core';

import {
    channelTypeSupplierPermission,
    channelTypeMerchantPermission,
    productChannelSchema
} from './constants';

@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        config.authOptions.customPermissions.push(
            channelTypeMerchantPermission,
            channelTypeSupplierPermission
        );
        return config;
    },
})
export class CustomPermissionsRolesPlugin {}