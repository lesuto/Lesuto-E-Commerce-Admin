import { VendurePlugin } from '@vendure/core';

@VendurePlugin({
    imports: [],
    // We intentionally leave this empty.
    // No 'adminUiExtension' (Angular garbage).
    // No 'providers' (No routes/menus).
    // This exists solely to reserve the namespace.
})
export class LesutoUiPlugin {}