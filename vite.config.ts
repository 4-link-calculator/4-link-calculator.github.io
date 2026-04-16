/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/',
    define: {
        global: "globalThis",
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: "globalThis",
            },
        },
    },
    test: {
        globals: true,
        environment: "node",
        setupFiles: "./tests/setupTests.ts",
        pool: "vmThreads",
        maxWorkers: 1,
        isolate: false,
    },
});
