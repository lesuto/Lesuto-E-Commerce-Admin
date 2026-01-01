import { PluginCommonModule, VendurePlugin, LanguageCode } from '@vendure/core';
import { APP_GUARD } from '@nestjs/core'; // Ensure this is imported
import { Global } from '@nestjs/common'; // <--- Import Global
import { SupplierOwnershipListeners } from './ownership.listeners';
import { SupplierOwnershipGuard } from './ownership.guard';

@Global() // <--- Add this decorator
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    SupplierOwnershipListeners,
    {
      provide: APP_GUARD,
      useClass: SupplierOwnershipGuard,
    },
  ],
  configuration: config => {
    // 1. ADD THIS LOG. If you don't see this on server start, 
    // your code changes are not being applied (rebuild needed).
    console.log('--------------------------------------------------');
    console.log('✅ OWNERSHIP PLUGIN LOADED');
    console.log('--------------------------------------------------');

    config.customFields.Product.push({
      name: 'ownercompany', 
      type: 'string',
      public: false,
      readonly: true,
      label: [{ languageCode: LanguageCode.en, value: 'Owner Company' }],
    });

    config.customFields.ProductVariant.push({
      name: 'ownercompany', 
      type: 'string',
      public: false,
      readonly: true,
      label: [{ languageCode: LanguageCode.en, value: 'Owner Company' }],
    });

    return config;
  },
})
export class SupplierOwnershipPlugin {}