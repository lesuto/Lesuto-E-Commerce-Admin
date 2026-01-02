import { Button, defineDashboardExtension, Page, PageBlock, PageLayout, PageTitle } from '@vendure/dashboard';
import { useState } from 'react';
import { ShoppingCartIcon } from 'lucide-react';
import { FileTextIcon } from 'lucide-react';


defineDashboardExtension({
     navSections: [
        {
            id: 'account',
            title: 'Account',
            icon: FileTextIcon,
            placement: 'top', // Platform area
            order: 550, // After Customers (400), before Marketing (500)
        },
        {
            id: 'merchant_store',
            title: 'Store',
            icon: ShoppingCartIcon,
            placement: 'top', // Platform area
            order: 100 // After Customers (400), before Marketing (500)
        }
    ],
    routes: [],
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
