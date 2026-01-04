import { defineDashboardExtension } from '@vendure/dashboard';
import { InventoryComponent } from './inventory';

export default defineDashboardExtension({
    routes: [
        {
            path: '/inventory',
            component: InventoryComponent,
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