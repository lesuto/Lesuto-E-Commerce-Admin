import { defineDashboardExtension } from '@vendure/dashboard';
import { SellerInventory } from './inventory';
import { ShoppingCartIcon } from 'lucide-react';

export default defineDashboardExtension({
    routes: [
        {
            path: '/Inventory',
            component: SellerInventory,
            navMenuItem: {
                sectionId: 'seller_store',
                id: 'inventory',
                title: 'Inventory',
            },
        },
    ],
  // Placeholders for other extensions
  pageBlocks: [], actionBarItems: [], alerts: [], widgets: [], 
  customFormComponents: {}, dataTables: [], login: {}, historyEntries: [],
});