import { defineDashboardExtension } from '@vendure/dashboard';
// FIX 3: Import from lowercase filename
import { GlobalFacetList } from './GlobalFacetList'; 
import React from 'react';

defineDashboardExtension({
    routes: [
        {
            path: '/settings/global-facets',
            loader: () => ({ breadcrumb: 'Global Facets' }),
            navMenuItem: {
                id: 'global-facets',
                title: 'Global Facets',
                sectionId: 'settings', 
            },
            component: GlobalFacetList,
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