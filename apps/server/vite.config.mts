import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/dashboard',
    build: {
        outDir: join(__dirname, 'dist/dashboard'),
        emptyOutDir: true,
    },
    plugins: [
        vendureDashboardPlugin({
            // This is the key: it points to your server config
            vendureConfigPath: pathToFileURL(resolve(__dirname, 'src/vendure-config.ts')).href,
            
            api: { host: 'auto', port: 'auto' },
            gqlOutputPath: './src/gql',
            
            // REMOVE 'extensions' array here. It causes the error.
        }),
    ],
    resolve: {
        alias: {
            '@lesuto/ui': resolve(__dirname, './src/plugins/lesuto-ui'),
            '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
            '@plugins': resolve(__dirname, './src/plugins'),
        },
    },
    server: {
        watch: {
            ignored: ['!**/src/plugins/**']
        }
    }
});