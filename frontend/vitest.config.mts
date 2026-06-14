import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

const emptyModule = fileURLToPath(
  new URL('./src/test/empty-module.ts', import.meta.url)
)

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // `server-only`/`client-only` lançam fora do runtime RSC; neutralizados nos testes.
    alias: {
      'server-only': emptyModule,
      'client-only': emptyModule,
    },
  },
})
