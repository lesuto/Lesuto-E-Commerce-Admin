import { defineDashboardExtension } from '@vendure/dashboard';
import { ProfilePage } from './profile-page';

defineDashboardExtension({
    routes: [
        {
            path: '/supplier/account/profile',
            loader: () => ({ breadcrumb: 'Supplier / Account / Profile' }),
            navMenuItem: {
                id: 'supplier_account_profile',
                title: 'Profile',
                sectionId: 'account',
                requiresPermission: '_ChannelTypeSupplier'
            },
            component: ProfilePage,
        },
    ],
});