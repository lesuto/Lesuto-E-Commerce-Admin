import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/dashboard',
    build: {
        // Ensures the build output matches where DashboardPlugin looks in vendure-config.ts
        outDir: join(__dirname, 'dist/dashboard'),
        emptyOutDir: true, // Clears the directory before building
    },
    plugins: [
        vendureDashboardPlugin({
            // Adjust if in monorepo; test with console.log(resolve(__dirname, 'src/vendure-config.ts')) in a script
            vendureConfigPath: pathToFileURL(resolve(__dirname, 'src/vendure-config.ts')).href,
            
            api: { host: 'auto', port: 'auto' }, // Use 'auto' for dev to avoid URL issues
            
            // Generates types for your custom entities (like Marketplace types)
            gqlOutputPath: './src/gql',
        }),
    ],
    resolve: {
        alias: {
            '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
            // 2. ADDED: This allows your Dashboard React components to import 
            // from your plugin source easily (e.g. import { X } from '@plugins/marketplace/...')
            '@plugins': resolve(__dirname, './src/plugins'),
        },
    },
    // 3. ADDED: Ensures Vite watches your plugin folder for changes while developing
    server: {
        watch: {
            ignored: ['!**/src/plugins/**']
        }
    }
});