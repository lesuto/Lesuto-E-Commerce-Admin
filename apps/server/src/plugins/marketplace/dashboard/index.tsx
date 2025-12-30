import { defineDashboardExtension } from '@vendure/dashboard';
import { MarketplaceComponent } from './components/MarketplaceComponent';

export default defineDashboardExtension({
    routes: [
        {
            path: '/marketplace',
            loader: () => ({ breadcrumb: 'Marketplace' }),
            navMenuItem: {
                id: 'marketplace',
                title: 'Marketplace',
                sectionId: 'catalog',
            },
            component: MarketplaceComponent,
        },
    ],
    // Placeholders
    pageBlocks: [], navSections: [], actionBarItems: [], alerts: [], widgets: [], 
    customFormComponents: {}, dataTables: [], detailForms: [], login: {}, historyEntries: [],
});

// id: 'marketplace',
// title: 'Marketplace',
// sectionId: 'sales', 
// icon: 'store',