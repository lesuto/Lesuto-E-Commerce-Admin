import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { SupplierProfile } from './entities/supplier-profile.entity';
import { supplierProfileApiExtensions } from './api/api-extensions';
import { SupplierProfileResolver } from './api/supplier-profile.resolver';
import { SupplierProfileService } from './services/supplier-profile.service';
import { SUPPLIER_PROFILE_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [SupplierProfile], // <--- Register Entity
    providers: [
        { provide: SUPPLIER_PROFILE_PLUGIN_OPTIONS, useFactory: () => SupplierProfilePlugin.options },
        SupplierProfileService, // <--- Register Service
    ],
    adminApiExtensions: {
        schema: supplierProfileApiExtensions, // <--- Register Schema
        resolvers: [SupplierProfileResolver], // <--- Register Resolver
    },
    configuration: config => config,
    compatibility: '^3.0.0',
    dashboard: './dashboard/index.tsx',
})
export class SupplierProfilePlugin {
    static options: PluginInitOptions;
    static init(options: PluginInitOptions): Type<SupplierProfilePlugin> {
        this.options = options;
        return SupplierProfilePlugin;
    }
}