import { VendurePlugin } from '@vendure/core';
import path from 'path';

@VendurePlugin({
    imports: [],
    // This tells Vendure: "I have a React extension at this path"
    dashboard: './logo-extension', 
})
export class ThemePlugin {}
