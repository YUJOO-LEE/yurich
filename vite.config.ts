import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [react(), dts({
      tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
      include: ['src'],
      rollupTypes: true,
      // CommonJS consumers need declarations TypeScript reads as CommonJS
      afterBuild: () => copyFileSync(resolve(__dirname, 'dist/index.d.ts'), resolve(__dirname, 'dist/index.d.cts')),
    })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TextEditor',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})
