import { PluginCommonModule, VendurePlugin, LanguageCode, Type } from '@vendure/core';

export interface CustomPermissionsChannelPluginOptions {}

@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        config.customFields.Channel.push(
            {
                name: 'isSupplier',
                type: 'boolean',
                public: true,
                defaultValue: false,
                label: [{ languageCode: LanguageCode.en, value: 'Is a Supplier?' }],
            },
            {
                name: 'isMerchant',
                type: 'boolean',
                public: true,
                defaultValue: false,
                label: [{ languageCode: LanguageCode.en, value: 'Is a Merchant?' }],
            },
            {
                name: 'isMarketplaceApproved',
                type: 'boolean',
                public: true,
                defaultValue: false,
                label: [{ languageCode: LanguageCode.en, value: 'Approved for Marketplace' }],
            },
            {
                name: 'isLesutoManaged',
                type: 'boolean',
                public: true,
                defaultValue: false,
                label: [{ languageCode: LanguageCode.en, value: 'Lesuto Managed Account' }],
            }
        );
        return config;
    },
})
export class CustomPermissionsChannelsPlugin {
    static options: CustomPermissionsChannelPluginOptions;
    static init(options: CustomPermissionsChannelPluginOptions): Type<CustomPermissionsChannelsPlugin> {
        this.options = options;
        return CustomPermissionsChannelsPlugin;
    }
}