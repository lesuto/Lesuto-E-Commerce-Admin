import { VendurePlugin, PluginCommonModule } from '@vendure/core';
import { ProductChannelResolver } from './resolver';
import {
    manageProductAssignmentsPermission,
    channelTypeSupplierPermission,
    channelTypeMerchantPermission,
    productChannelSchema
} from './constants';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        ProductChannelResolver,
    ],
    adminApiExtensions: {
        schema: productChannelSchema,
        resolvers: [ProductChannelResolver],
    },
    configuration: config => {
        config.authOptions.customPermissions.push(
            manageProductAssignmentsPermission,
            channelTypeMerchantPermission,
            channelTypeSupplierPermission
        );
        return config;
    },
})
export class ProductChannelPlugin {}