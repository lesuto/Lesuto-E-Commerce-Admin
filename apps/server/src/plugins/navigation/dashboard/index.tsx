import { Button, defineDashboardExtension, Page, PageBlock, PageLayout, PageTitle } from '@vendure/dashboard';
import { useState } from 'react';
import { ShoppingCartIcon } from 'lucide-react';
import { FileTextIcon } from 'lucide-react';


defineDashboardExtension({
     navSections: [
        {
            id: 'seller_account',
            title: 'Account',
            icon: FileTextIcon,
            placement: 'top', // Platform area
            order: 550, // After Customers (400), before Marketing (500)
        },
        {
            id: 'seller_store',
            title: 'Store',
            icon: ShoppingCartIcon,
            placement: 'top', // Platform area
            order: 100 // After Customers (400), before Marketing (500)
        }
    ],
    routes: [
        {
            path: '/test',
            component: () => <div>Articles</div>,
            navMenuItem: {
                sectionId: 'seller_store',
                id: 'test',
                title: 'test',
                requiresPermission : '_ChannelTypeStorefront'
            },
        },
    ],
    pageBlocks: [],
    actionBarItems: [],
    alerts: [],
    widgets: [],
    customFormComponents: {},
    dataTables: [],
    detailForms: [],
    login: {},
    historyEntries: [],
});
