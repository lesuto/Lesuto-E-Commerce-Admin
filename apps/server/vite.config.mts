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

            theme: {
                light: {
                    // Set primary to vibrant green from chameleon palette
                    primary: "oklch(0.71 0.58 120)",
                    "primary-foreground": "oklch(0.1 0.01 120)",
                    
                    // Brand colors based on chameleon green
                    brand: "#6bff6b",
                    "brand-lighter": "#b3ffb3", // Lighter green variant
                    
                    // Custom chameleon palette colors
                    "chameleon-red": "#ff6b6b",
                    "chameleon-yellow": "#ffd93d",
                    "chameleon-green": "#6bff6b",
                    "chameleon-cyan": "#6beeff",
                    "chameleon-blue": "#6b8cff",
                    "chameleon-magenta": "#d96bff",
                },
                dark: {
                    // Muted primary for dark mode
                    primary: "oklch(0.5 0.4 120)",
                    "primary-foreground": "oklch(0.95 0.01 120)",
                    
                    // Same brand colors work for dark mode
                    brand: "#6bff6b",
                    "brand-lighter": "#b3ffb3",
                    
                    // Custom chameleon palette (same as light, or adjust if needed for contrast)
                    "chameleon-red": "#ff6b6b",
                    "chameleon-yellow": "#ffd93d",
                    "chameleon-green": "#6bff6b",
                    "chameleon-cyan": "#6beeff",
                    "chameleon-blue": "#6b8cff",
                    "chameleon-magenta": "#d96bff",
                },
            },
            
            // REMOVE 'extensions' array here. It causes the error.
        }),
    ],
    resolve: {
        alias: {
            '@lesuto/ui': resolve(__dirname, './src/lesuto-ui'),
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