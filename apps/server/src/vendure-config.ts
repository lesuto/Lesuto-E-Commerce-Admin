import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    VendureConfig,
    LanguageCode,
    DefaultProductVariantPriceUpdateStrategy
} from '@vendure/core';
import { ElasticsearchPlugin } from '@vendure/elasticsearch-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { EmailPlugin, defaultEmailHandlers, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { ThemePlugin } from './plugins/theme/login/login-plugin';
import { NavigationPlugin } from './plugins/navigation/navigation.plugin';
import { CustomPermissionsRolesPlugin } from './plugins/custom-permissions-roles';
import { CustomPermissionsChannelsPlugin } from './plugins/custom-permissions-channels/custom-permissions-channel.plugins';
import { MerchantMarketplacePlugin } from './plugins/merchant/store/marketplace/marketplace.plugin';
import { MerchantInventoryPlugin } from './plugins/merchant/store/inventory/inventory.plugin';
import { MerchantBillingPlugin } from './plugins/merchant/account/billing/billing.plugin';
import { MerchantProfilePlugin } from './plugins/merchant/account/profile/profile.plugin';
import { SupplierProfilePlugin } from './plugins/supplier/account/profile/profile.plugin';
import { SupplierBillingPlugin } from './plugins/supplier/account/billing/billing.plugin';
import { SupplierOwnershipPlugin } from './plugins/supplier/ownership/ownership.plugin';
import { GlobalLoadingScreenPlugin } from './plugins/global-loading-screen/global-loading-screen.plugin';
import { GlobalFacetConfigurationPlugin } from './plugins/global-facet-configuration/global-facet-configuration.plugin';
import { GlobalVariantConfigurationPlugin } from './plugins/global-variant-configuration/global-variant-configuration.plugin';
import { TenantPlugin } from './plugins/tenant/tenant.plugin';
import { CmsPlugin } from './plugins/cms/cms.plugin';
import 'dotenv/config';
import path from 'path';

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    catalogOptions: {
        productVariantPriceUpdateStrategy: new DefaultProductVariantPriceUpdateStrategy({
            syncPricesAcrossChannels: true,
        }),
    },
    customFields: {
        Product: [
            {
                name: 'basePrice',
                type: 'int',
                public: true,
                nullable: true,
                label: [{ languageCode: LanguageCode.en, value: 'Base Price (Commission)' }],
                ui: { component: 'currency-form-input' },
            },
        ],
    },
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        ...(IS_DEV ? { adminApiDebug: true, shopApiDebug: true } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: { secret: process.env.COOKIE_SECRET },
        requireVerification: false
    },
    dbConnectionOptions: {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 6543,
        username: process.env.DB_USERNAME || 'vendure',
        password: process.env.DB_PASSWORD || '-m3ZXEdR3UWKQygHpUw5xw',
        database: process.env.DB_NAME || 'vendure',
        schema: process.env.DB_SCHEMA || 'public',
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: ['query', 'error'],
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    plugins: [
        ThemePlugin,
        NavigationPlugin.init({}),
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        
        // --- FIXED ELASTICSEARCH CONFIG ---
        ElasticsearchPlugin.init({
            host: 'http://localhost',
            port: 9200,
            // Removed 'searchConfig' with invalid options. 
            // Elastic defaults are usually sufficient for standard facet usage.
        }),

        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV ? path.join(__dirname, '../dist/dashboard') : path.join(__dirname, 'dashboard'),
        }),
        CustomPermissionsRolesPlugin,
        CustomPermissionsChannelsPlugin.init({}),
        MerchantMarketplacePlugin.init({}),
        MerchantInventoryPlugin.init({}),
        MerchantBillingPlugin.init({}),
        MerchantProfilePlugin.init({}),
        SupplierProfilePlugin.init({}),
        SupplierBillingPlugin.init({}),
        SupplierOwnershipPlugin,
        GlobalLoadingScreenPlugin.init({}),
        GlobalFacetConfigurationPlugin.init({}),
        GlobalVariantConfigurationPlugin.init({}),
        TenantPlugin.init({}),
        CmsPlugin.init({}),
    ],
};