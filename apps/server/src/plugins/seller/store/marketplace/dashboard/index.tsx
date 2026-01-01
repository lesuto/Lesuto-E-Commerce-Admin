import { defineDashboardExtension } from '@vendure/dashboard';
import { MarketplaceComponent } from './marketplace';
import { ShoppingCartIcon } from 'lucide-react';

export default defineDashboardExtension({
    routes: [
        {
            path: '/marketplace',
            loader: () => ({ breadcrumb: 'Marketplace' }),
            navMenuItem: {
                id: 'marketplace',
                title: 'Marketplace',
                sectionId: 'seller_store',
            },
            component: MarketplaceComponent,
        },
    ],
    // Placeholders
    pageBlocks: [], actionBarItems: [], alerts: [], widgets: [], 
    customFormComponents: {}, dataTables: [], detailForms: [], login: {}, historyEntries: [],
});