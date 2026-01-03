import { defineDashboardExtension } from '@vendure/dashboard';
import { MarketplaceComponent } from './marketplace';
import { SupplierDetailComponent } from './supplier-detail';

export default defineDashboardExtension({
    routes: [
        {
            path: '/marketplace',
            loader: () => ({ breadcrumb: 'Marketplace' }),
            navMenuItem: {
                id: 'marketplace',
                title: 'Marketplace',
                sectionId: 'merchant_store',
                requiresPermission : '_ChannelTypeMerchant',
            },
            component: MarketplaceComponent,
        },
        // --- THE FIX ---
        // Change ':id' to '*'
        // This accepts /marketplace/supplier/1, /marketplace/supplier/999, etc.
        {
            path: '/marketplace/supplier/$id', 
            loader: () => ({ 
                breadcrumb: [
                    { label: 'Marketplace', link: '/marketplace' },
                    { label: 'Supplier Details', link: '' }
                ] 
            }),
            component: SupplierDetailComponent,
        },
    ],
    pageBlocks: [], actionBarItems: [], alerts: [], widgets: [], 
    customFormComponents: {}, dataTables: [], detailForms: [], login: {}, historyEntries: [],
});