import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
    LanguageCode,
    Permission,
    DefaultProductVariantPriceUpdateStrategy
} from '@vendure/core';

//Permissions
import { CustomPermissionsRoles } from './plugins/custom-permissions-roles';
import { CustomPermissionsChannelsPlugin } from './plugins/custom-permissions-channels/custom-permissions-channel.plugins'


import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { ThemePlugin } from './plugins/theme/login/login-plugin';

import { MerchantBillingPlugin } from './plugins/merchant/account/billing/billing.plugin';
import { MerchantProfilePlugin } from './plugins/merchant/account/profile/profile.plugin';

import { MerchantInventoryPlugin } from './plugins/merchant/store/inventory/inventory.plugin';
import { MerchantMarketplacePlugin } from './plugins/merchant/store/marketplace/marketplace.plugin'; 

import { SupplierProfilePlugin } from './plugins/supplier/account/profile/profile.plugin';
import { SupplierBillingPlugin } from './plugins/supplier/account/billing/billing.plugin';
import { SupplierOwnershipPlugin } from './plugins/supplier/ownership/ownership.plugin';

import { NavigationPlugin } from './plugins/navigation/navigation.plugin';

import 'dotenv/config';
import path from 'path';

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    //Sync Catalog Prices Across All
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
                
                // ADD THIS SECTION:
                ui: { 
                    component: 'currency-form-input', 
                },
            },
        ],
    },
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
            secret: process.env.COOKIE_SECRET,
        },
        requireVerification: false
    },
    dbConnectionOptions: {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: ['query', 'error'],
        schema: process.env.DB_SCHEMA || 'public',
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
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
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
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
        CustomPermissionsRoles,
        CustomPermissionsChannelsPlugin.init({}),
        MerchantMarketplacePlugin.init({}),
        MerchantInventoryPlugin.init({}),
        MerchantBillingPlugin.init({}),
        MerchantProfilePlugin.init({}),
        SupplierProfilePlugin.init({}),
        SupplierBillingPlugin.init({}),
        SupplierOwnershipPlugin,
    ],
};