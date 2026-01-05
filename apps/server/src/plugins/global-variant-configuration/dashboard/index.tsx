import { defineDashboardExtension } from '@vendure/dashboard';
import { GlobalVariantSync } from './global-variant-sync';

export default defineDashboardExtension({
    routes: [
        {
            path: '/settings/global-variant-sync',
            loader: () => ({ breadcrumb: 'Global Variant Sync' }),
            navMenuItem: {
                id: 'global-variant-sync',
                title: 'Global Variant Sync',
                sectionId: 'settings', 
            },
            component: GlobalVariantSync,
        },
    ],
    pageBlocks: [],
    navSections: [],
    actionBarItems: [],
    alerts: [],
    widgets: [],
    customFormComponents: {},
    dataTables: [],
    detailForms: [],
    login: {},
    historyEntries: [],
});