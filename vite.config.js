import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
        host: process.env.VITE_HOST ?? '0.0.0.0',
        port: Number(process.env.VITE_PORT ?? 5174),
        strictPort: false,
        hmr: {
            host: process.env.VITE_HMR_HOST ?? 'localhost',
            port: Number(process.env.VITE_HMR_PORT ?? process.env.VITE_PORT ?? 5174),
            protocol: 'ws',
        },
    },
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
});
