import { defineDashboardExtension } from '@vendure/dashboard';
import { MerchantInventory } from './inventory';
import { ShoppingCartIcon } from 'lucide-react';

export default defineDashboardExtension({
    routes: [
        {
            path: '/Inventory',
            component: MerchantInventory,
            navMenuItem: {
                sectionId: 'merchant_store',
                id: 'inventory',
                title: 'Inventory',
                requiresPermission : '_ChannelTypeMerchant'
            },
        },
    ],
  // Placeholders for other extensions
  pageBlocks: [], actionBarItems: [], alerts: [], widgets: [], 
  customFormComponents: {}, dataTables: [], login: {}, historyEntries: [],
});