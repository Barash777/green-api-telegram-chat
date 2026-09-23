import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    test: {
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/main.tsx', 'src/**/*.types.ts', 'src/**/*.d.ts'],
            reporter: ['text', 'html', 'json-summary'],
        },
    },
})
